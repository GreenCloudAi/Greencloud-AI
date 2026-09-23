import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { EC2Client, DescribeRegionsCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

async function main() {
  console.log("Checking credentials from .env.local...");
  console.log("AWS_DEFAULT_REGION:", process.env.AWS_DEFAULT_REGION);

  const stsClient = new STSClient({ region: "us-east-1" });
  let credentials;
  try {
    const roleArn = process.env.ROLE_ARN || "arn:aws:iam::123456789012:role/GreenCloudReadOnlyRole";
    console.log("Assuming role:", roleArn);
    const assumeRes = await stsClient.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "RegionFinder",
      ExternalId: "greencloud-demo",
      DurationSeconds: 900
    }));
    credentials = {
      accessKeyId: assumeRes.Credentials.AccessKeyId,
      secretAccessKey: assumeRes.Credentials.SecretAccessKey,
      sessionToken: assumeRes.Credentials.SessionToken,
    };
    console.log("Successfully assumed role!");
  } catch (err) {
    console.error("Failed to assume role:", err.message);
    credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  // 1. Describe Regions
  const ec2Base = new EC2Client({ region: "us-east-1", credentials });
  const regionsRes = await ec2Base.send(new DescribeRegionsCommand({ AllRegions: false }));
  const regions = regionsRes.Regions.map(r => r.RegionName);
  console.log(`Discovered ${regions.length} enabled regions:`, regions.join(", "));

  // 2. Scan every region for instances
  for (const reg of regions) {
    try {
      const client = new EC2Client({ region: reg, credentials });
      const instRes = await client.send(new DescribeInstancesCommand({}));
      const instances = [];
      for (const res of instRes.Reservations || []) {
        for (const inst of res.Instances || []) {
          instances.push({
            id: inst.InstanceId,
            type: inst.InstanceType,
            state: inst.State?.Name,
            launchTime: inst.LaunchTime,
            name: inst.Tags?.find(t => t.Key === 'Name')?.Value || 'unnamed'
          });
        }
      }
      if (instances.length > 0) {
        console.log(`\n========================================`);
        console.log(`>>> FOUND IN REGION [${reg}]: ${instances.length} instances`);
        console.log(JSON.stringify(instances, null, 2));
        console.log(`========================================\n`);
      } else {
        process.stdout.write(`.`);
      }
    } catch (err) {
      console.error(`\nError scanning region ${reg}:`, err.message);
    }
  }
  console.log("\nFinished region scan!");
}

main().catch(console.error);
