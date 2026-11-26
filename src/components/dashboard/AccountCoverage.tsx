import type { DashboardData, DashboardTab, RoleFilter } from "./types";

const providerLabels = { aws: "AWS", azure: "Azure", gcp: "Google Cloud" };

const roleViews: Record<RoleFilter, { title: string; detail: string; tab: DashboardTab; action: string }> = {
  admin: { title: "Account health", detail: "Connection", tab: "resources", action: "View inventory" },
  finops: { title: "Billing coverage", detail: "Reported spend", tab: "costs", action: "View costs" },
  devops: { title: "Fleet health", detail: "CPU observations", tab: "resources", action: "View resources" },
  architect: { title: "Deployment footprint", detail: "Active regions", tab: "resources", action: "Compare resources" },
  sustainability: { title: "Emissions coverage", detail: "Operational estimate", tab: "carbon", action: "View carbon" },
  viewer: { title: "Portfolio coverage", detail: "Reported spend", tab: "costs", action: "View costs" },
};

function formatAmount(amount: number, currency: string) {
  return /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code" }).format(amount)
    : `${amount.toFixed(2)} ${currency || "unknown currency"}`;
}

function sourceLabel(account: DashboardData["selectedAccounts"][number]) {
  try {
    if (JSON.parse(account.providerConfig ?? "{}")?.ingestMode === "focus_import") return "FOCUS import";
  } catch {
    return "Source unavailable";
  }
  return account.provider === "aws" && account.roleArn ? "AWS connection" : "Source unavailable";
}

export function AccountCoverage({ data, role, onSelectTab }: {
  data: DashboardData;
  role: RoleFilter;
  onSelectTab: (tab: DashboardTab) => void;
}) {
  const view = roleViews[role];
  const comparisons = new Map(data.comparisons.byAccount.map((account) => [account.id, account]));
  const fleet = new Map<string, DashboardData["resources"]["ec2"]>();
  for (const resource of data.resources.ec2) {
    const accountFleet = fleet.get(resource.cloudAccountId) ?? [];
    accountFleet.push(resource);
    fleet.set(resource.cloudAccountId, accountFleet);
  }
  const regions = new Map<string, Set<string>>();
  for (const resource of [...data.resources.ec2, ...data.resources.ebs, ...data.resources.eip]) {
    const accountRegions = regions.get(resource.cloudAccountId) ?? new Set<string>();
    accountRegions.add(resource.region);
    regions.set(resource.cloudAccountId, accountRegions);
  }

  const accounts = data.selectedAccounts.map((account) => {
    const totals = comparisons.get(account.id)?.billingTotals ?? [];
    const running = (fleet.get(account.id) ?? []).filter((resource) => resource.lifecycleState === "running");
    const measured = running.filter((resource) => resource.avgCpu !== null);
    return {
      account,
      totals,
      running,
      measured,
      lowCpu: measured.filter((resource) => resource.avgCpu! < 10).length,
    };
  });

  const billedCount = accounts.filter(({ totals }) => totals.length > 0).length;
  const issueCount = accounts.filter(({ account }) => account.syncError || account.status === "sync_failed").length;
  const missingCpu = accounts.reduce((total, { running, measured }) => total + running.length - measured.length, 0);

  return (
    <section className="rounded-[24px] bg-[#FFFDF4] p-5 text-[#2E2B1A] sm:p-6" aria-labelledby="account-coverage-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="account-coverage-title" className="text-lg font-extrabold">{view.title}</h2>
          <p className="mt-1 text-sm text-[#686450]">
            {billedCount} of {accounts.length} accounts report billing for this period
            {issueCount > 0 && ` · ${issueCount} with sync issues`}
            {missingCpu > 0 && ` · ${missingCpu} running without CPU samples`}
          </p>
        </div>
        <button type="button" onClick={() => onSelectTab(view.tab)} className="rounded-full bg-[#ECE5CC] px-4 py-2 text-sm font-bold">
          {view.action}
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[#686450]">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th scope="col">Account</th><th scope="col">Source</th><th scope="col">Billing data</th><th scope="col">{view.detail}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(({ account, totals, running, measured, lowCpu }) => {
              const carbon = (fleet.get(account.id) ?? []).flatMap((resource) => resource.carbonEmissions);
              const detail = {
                admin: account.syncError || account.status === "sync_failed" ? "Sync needs attention"
                  : account.status === "syncing" ? "Syncing"
                  : account.syncFreshness ? `Last sync ${new Date(account.syncFreshness).toLocaleDateString()}` : "No recorded sync",
                finops: totals.map(({ amount, currency }) => formatAmount(amount, currency)).join(" · ") || "—",
                devops: `${running.length} running · ${lowCpu} below 10% avg CPU · ${running.length - measured.length} missing CPU`,
                architect: `${regions.get(account.id)?.size ?? 0} regions with resources`,
                sustainability: carbon.length
                  ? `${(carbon.reduce((sum, entry) => sum + entry.operationalGco2e, 0) / 1000).toFixed(2)} kg CO₂e compute estimate`
                  : "No compute estimate",
                viewer: totals.map(({ amount, currency }) => formatAmount(amount, currency)).join(" · ") || "—",
              }[role];
              return (
                <tr key={account.id} className="border-t border-[#ECE5CC] [&>td]:px-3 [&>td]:py-3">
                  <td className="font-bold">{account.name}<span className="ml-2 font-normal text-[#686450]">{providerLabels[account.provider]}</span></td>
                  <td>{sourceLabel(account)}</td>
                  <td>{totals.length ? "Available" : "No rows in period"}</td>
                  <td>
                    {detail}
                    {account.sync && (
                      <details className="mt-2 text-xs text-[#686450]">
                        <summary className="cursor-pointer">Sync {account.sync.status} · {new Date(account.sync.attemptedAt).toLocaleString()}</summary>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(account.sync.sources).map(([source, result]) => (
                            <li key={source}>
                              {source} · {result.status.replaceAll("_", " ")} · {result.records} records
                              {result.lastSuccess && " · Last success " + new Date(result.lastSuccess).toLocaleString()}
                              {result.error && " · " + result.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
