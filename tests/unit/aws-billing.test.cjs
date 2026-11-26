const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function loadService(name, dependencies) {
  const file = path.resolve(__dirname, "../../src/services", name + ".ts");
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const service = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (specifier) => Object.hasOwn(dependencies, specifier) ? dependencies[specifier] : require(specifier),
    service,
    service.exports,
  );
  return service.exports;
}

const accountId = "123456789012";
const roleArn = `arn:aws:iam::${accountId}:role/GreenCloudReadOnlyRole`;
const noop = () => {};
const logger = { Logger: { info: noop, success: noop, warn: noop, error: noop } };

test("Cost Explorer scopes each page to the linked account and preserves signed and zero amounts", async () => {
  const requests = [];
  const pages = [
    { NextPageToken: "next", ResultsByTime: [day("3.25", true), day("0")] },
    { ResultsByTime: [day("-1.25")] },
  ];
  function day(amount, estimated = false) {
    return {
      TimePeriod: { Start: "2026-10-01" },
      Estimated: estimated,
      Groups: [{ Keys: ["Amazon EC2"], Metrics: { UnblendedCost: { Amount: amount, Unit: "USD" } } }],
    };
  }
  class CostExplorerClient {
    async send(command) {
      requests.push(command.input);
      return pages.shift();
    }
  }
  const { AwsCloudConnector } = loadService("awsConnector", {
    "./dnsFallback": {},
    "./config": { GreenCloudConfig: { scanRegions: [], defaultRegion: "us-east-1" } },
    "./logger": logger,
    "@aws-sdk/client-cost-explorer": {
      CostExplorerClient,
      GetCostAndUsageCommand: class { constructor(input) { this.input = input; } },
    },
  });
  const connector = new AwsCloudConnector(roleArn);
  connector.getCredentials = async () => ({});
  const rows = await connector.fetchBillingSummary("2026-10-01", "2026-10-02", accountId);
  assert.deepEqual(requests.map(request => request.NextPageToken), [undefined, "next"]);
  assert.ok(requests.every(request => request.Filter.Dimensions.Key === "LINKED_ACCOUNT"));
  assert.ok(requests.every(request => request.Filter.Dimensions.Values[0] === accountId));
  assert.deepEqual(rows.map(row => [row.Cost, row.Currency, row.Estimated]), [
    [3.25, "USD", true], [0, "USD", false], [-1.25, "USD", false],
  ]);
});

for (const scenario of ["available", "no_rows", "failed"]) {
  test(`AWS ingestion records ${scenario} and only replaces billing after receiving rows`, async () => {
    const operations = [];
    let audit;
    const prisma = {
      cloudAccount: { findFirst: async () => ({ provider: "aws", roleArn, externalAccountId: accountId }), update: async () => {} },
      costLineItem: {
        deleteMany: (input) => ({ operation: "delete", input }),
        createMany: (input) => ({ operation: "insert", input }),
      },
      $transaction: async (batch) => operations.push(batch),
      auditLog: { create: async ({ data }) => { audit = JSON.parse(data.metadata); } },
    };
    class AwsCloudConnector {
      async fetchEC2Instances() { return []; }
      async fetchEBSVolumes() { return []; }
      async fetchElasticIPs() { return []; }
      async fetchBillingSummary(_start, _end, id) {
        assert.equal(id, accountId);
        if (scenario === "failed") throw new Error("Billing unavailable");
        return scenario === "no_rows" ? [] :
          [{ Date: "2026-10-01", Service: "Amazon EC2", Cost: -1, Currency: "EUR", Estimated: true }];
      }
    }
    const { IngestionService } = loadService("ingestion", {
      "./db": { prisma },
      "./awsConnector": { AwsCloudConnector },
      "./carbonEngine": {},
      "./config": { GreenCloudConfig: { maxRetries: 1, retryBaseDelayMs: 0 } },
      "./logger": logger,
      "./encryption": {},
      "./cloudMetadata": { normalizeProviderId: value => value, normalizeFocusServiceCategory: () => "Compute" },
    });
    const result = await new IngestionService("workspace", "account").runSync();
    assert.equal(audit.billing.status, scenario);
    assert.equal(result.errors.length, scenario === "failed" ? 1 : 0);
    if (scenario === "available") {
      assert.equal(operations.length, 1);
      const [[deletion, insertion]] = operations;
      assert.equal(deletion.input.where.cloudAccountId, "account");
      assert.ok(deletion.input.where.chargeDate.gte < deletion.input.where.chargeDate.lt);
      const [record] = insertion.input.data;
      assert.equal(record.resourceId, undefined);
      assert.equal(record.currency, "EUR");
      assert.equal(record.billedCost, -1);
      assert.equal(audit.billing.storedRows, 1);
      assert.equal(audit.billing.estimatedRows, 1);
    } else {
      assert.deepEqual(operations, []);
      assert.equal(audit.billing.storedRows, 0);
    }
  });
}
