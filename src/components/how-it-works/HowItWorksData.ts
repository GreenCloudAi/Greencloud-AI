export type MorphShape = "sunny" | "clover" | "flower" | "cookie9";

export interface UserStep {
  num: string;
  timing: string;
  title: string;
  desc: string;
  bullets: string[];
  shape: MorphShape;
  shapeColor: string;
  numInk: string;
  trayBg: string;
}

export interface ArchitectureColumn {
  num: string;
  subtitle: string;
  title: string;
  desc: string;
  shape: MorphShape;
  shapeColor: string;
  numInk: string;
  trayBg: string;
  points: string[];
}

export interface SafetyScenarioCheck {
  label: string;
  status: "pass" | "hold" | "alert";
  detail: string;
}

export interface SafetyScenario {
  id: string;
  tabLabel: string;
  badgeText: string;
  badgeClass: string;
  subtitle: string;
  headline: string;
  explanation: string;
  beforeAfter: {
    currentSpend: string;
    expectedChange: string;
    verifiedStatus: string;
  };
  checks: SafetyScenarioCheck[];
  takeaway: string;
  terraformPreview?: string;
}

export interface MetricClarityItem {
  subtitle: string;
  title: string;
  whenShown: string;
  chipBg: string;
  chipInk: string;
  desc: string;
  shape: MorphShape;
  shapeColor: string;
  iconInk: string;
  icon: string;
}

export const USER_STEPS: UserStep[] = [
  {
    num: "01",
    timing: "Takes under 2 minutes",
    title: "Connect AWS with read-only access",
    desc: "Link your AWS account using a read-only IAM role and External ID, or explore right away using built-in sample data.",
    bullets: [
      "Zero write permissions to your servers or databases",
      "Reads billing history, server inventory, and CloudWatch metrics",
      "No permanent root credentials or static keys needed",
    ],
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    numInk: "text-[#524305]",
    trayBg: "bg-[#FFF7DC]",
  },
  {
    num: "02",
    timing: "14-day usage history",
    title: "Find real waste without guessing",
    desc: "GreenCloud looks at 14 days of CPU peaks, available memory stats, unattached storage disks, public IPv4 usage, and regional energy intensity.",
    bullets: [
      "Checks peak spikes, not just low daily averages",
      "Spots detached EBS volumes and unused public IPs",
      "Flags missing memory metrics openly instead of guessing",
    ],
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    numInk: "text-[#6B4814]",
    trayBg: "bg-[#FBF0DE]",
  },
  {
    num: "03",
    timing: "Code you review first",
    title: "Inspect safe fixes & Terraform diffs",
    desc: "Each suggestion lists only compatible instance sizes, estimated monthly savings, carbon impact, and ready-to-review Terraform code.",
    bullets: [
      "Holds back risky stops if owner tags or traffic proof are missing",
      "Calculates region-accurate AWS pricing without double-counting",
      "Gives engineers a clean diff instead of vague advice",
    ],
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    numInk: "text-[#155E4B]",
    trayBg: "bg-[#E2F5EF]",
  },
  {
    num: "04",
    timing: "Confirm after you deploy",
    title: "Apply yourself & verify real savings",
    desc: "You decide when to merge changes in your own workflow. After your AWS bill settles, GreenCloud compares before vs. after spend and latency.",
    bullets: [
      "Never modifies or shuts down production workloads on its own",
      "Compares equal weeks before and after your change",
      "Alerts immediately if response times degrade after a resize",
    ],
    shape: "cookie9",
    shapeColor: "text-[#EAE0BE]",
    numInk: "text-[#2E2B1A]",
    trayBg: "bg-[#F3EEDB]",
  },
];

export const SAFETY_SCENARIOS: SafetyScenario[] = [
  {
    id: "safe-rightsize",
    tabLabel: "Safe to resize",
    badgeText: "Ready to review",
    badgeClass: "bg-[#E2F5EF] text-[#155E4B]",
    subtitle: "Amazon EC2 · api-worker-prod",
    headline: "Move m6i.xlarge to t4g.large",
    explanation:
      "Over the last 14 days, CPU peaks stayed at 21% and memory usage never exceeded 3.1 GB on an 8 GB budget. Moving to a smaller Graviton instance keeps plenty of headroom while cutting monthly spend.",
    beforeAfter: {
      currentSpend: "$140 / mo (observed AWS bill)",
      expectedChange: "Save ~$68 / mo & 14 kg CO₂e",
      verifiedStatus: "Waiting for your review",
    },
    checks: [
      {
        label: "Team owner assigned",
        status: "pass",
        detail: "Owned by checkout-platform with an approved maintenance window.",
      },
      {
        label: "14-day peak CPU & memory check",
        status: "pass",
        detail: "CloudWatch CPU + Agent memory covered 99% of intervals.",
      },
      {
        label: "Traffic headroom kept safe",
        status: "pass",
        detail: "Target 8 GB memory holds more than 2x your recent peak.",
      },
      {
        label: "Pricing & discount match",
        status: "pass",
        detail: "Calculated cleanly for us-east-1 Linux with no discount overlap.",
      },
    ],
    takeaway:
      "You get a clear Terraform code change and estimated savings range. Nothing changes on AWS until your team merges the fix.",
    terraformPreview: `# Suggested in review queue (human approval required)
resource "aws_instance" "api_worker_prod" {
  instance_type = "t4g.large" # Down from m6i.xlarge (peaks stay under 40%)
}`,
  },
  {
    id: "held-back",
    tabLabel: "Protected from risky cuts",
    badgeText: "Held for review",
    badgeClass: "bg-[#FBE7CB] text-[#6B4814]",
    subtitle: "Amazon EC2 · nightly-batch-runner",
    headline: "Why GreenCloud didn't suggest stopping this server",
    explanation:
      "Basic cost tools see a 4% average CPU and tell you to shut the server off. GreenCloud spots nightly 88% spikes and notices memory monitoring isn't turned on, so it asks a human to inspect instead of recommending a risky change.",
    beforeAfter: {
      currentSpend: "$368 / mo (observed AWS bill)",
      expectedChange: "Withheld until memory stats are added",
      verifiedStatus: "Needs investigation first",
    },
    checks: [
      {
        label: "Owner tag present",
        status: "hold",
        detail: "No team owner tag found on this instance yet.",
      },
      {
        label: "Nightly peak protection",
        status: "hold",
        detail: "Average CPU is 4%, but a batch job spikes CPU to 88% at 2:00 AM.",
      },
      {
        label: "Memory usage visibility",
        status: "hold",
        detail: "CloudWatch Agent RAM stats are missing, so downsizing could crash jobs.",
      },
      {
        label: "Safe next step",
        status: "pass",
        detail: "Flags instance for owner check before recommending any resize.",
      },
    ],
    takeaway:
      "Missing evidence means GreenCloud protects uptime first. You never get pushed into breaking an unmonitored nightly job.",
  },
  {
    id: "post-check",
    tabLabel: "Verified after deployment",
    badgeText: "Checks bill & speed",
    badgeClass: "bg-[#FFF3A8] text-[#524305]",
    subtitle: "Post-change monitoring · staging-search",
    headline: "Catching performance drops after a change",
    explanation:
      "Saving money doesn't count if your app slows down. Once you record an applied change, GreenCloud waits for your updated AWS bill and checks app latency side by side with spend.",
    beforeAfter: {
      currentSpend: "$62 / mo before -> $31 / mo after",
      expectedChange: "$31 / mo bill reduction confirmed",
      verifiedStatus: "Flagged slow response (rollback prompt)",
    },
    checks: [
      {
        label: "Updated AWS bill settled",
        status: "pass",
        detail: "Waited for billing lag to clear before comparing 14-day windows.",
      },
      {
        label: "Equal week-to-week comparison",
        status: "pass",
        detail: "Checked request traffic stayed steady so comparisons remain fair.",
      },
      {
        label: "App latency guardrail",
        status: "alert",
        detail: "Search P95 latency rose from 92ms to 164ms (above your 120ms target).",
      },
      {
        label: "Honest outcome label",
        status: "alert",
        detail: "Blocked false savings celebration and surfaced your rollback steps.",
      },
    ],
    takeaway:
      "GreenCloud closes the loop: if a smaller server slows users down, it alerts you to roll back rather than reporting a win.",
  },
];

export const ARCHITECTURE_FLOW: ArchitectureColumn[] = [
  {
    num: "01",
    subtitle: "Your AWS Environment",
    title: "Safe read-only access",
    desc: "You grant view-only access via a scoped cross-account IAM Role and External ID. Your servers stay untouched.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    numInk: "text-[#524305]",
    trayBg: "bg-[#FFF7DC]",
    points: [
      "EC2, EBS, and Public IPv4 inventory",
      "CloudWatch usage metrics (14+ days)",
      "AWS billing & Cost Explorer / CUR exports",
    ],
  },
  {
    num: "02",
    subtitle: "GreenCloud Engine",
    title: "Checks waste & safety limits",
    desc: "Pairs utilization peaks, missing-data safeguards, region-specific AWS prices, and grid carbon data before ranking any option.",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    numInk: "text-[#6B4814]",
    trayBg: "bg-[#FBF0DE]",
    points: [
      "Protects bursty workloads from false idle flags",
      "Removes duplicate savings across overlapping fixes",
      "Produces copy-ready Terraform HCL diffs",
    ],
  },
  {
    num: "03",
    subtitle: "Your Team Workflow",
    title: "Review, apply & confirm",
    desc: "Inspect findings on the dashboard, apply fixes through your normal Terraform or Git process, and track verified results.",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    numInk: "text-[#155E4B]",
    trayBg: "bg-[#E2F5EF]",
    points: [
      "Full human sign-off on every recommendation",
      "Tracks before vs. after AWS billing outcomes",
      "Every approval saved in Audit History",
    ],
  },
];

export const METRIC_CLARITY_CARDS: MetricClarityItem[] = [
  {
    subtitle: "Actual AWS charge",
    title: "Observed billed spend",
    whenShown: "Shows what you paid",
    chipBg: "bg-[#FBF6E3]",
    chipInk: "text-[#6B4814]",
    desc: "Pulled from your real AWS billing lines for EC2, storage, and IPv4 addresses without attributing whole-service bills onto single servers.",
    shape: "sunny",
    shapeColor: "text-[#FFE985]",
    iconInk: "text-[#524305]",
    icon: "receipt_long",
  },
  {
    subtitle: "Before you apply",
    title: "Estimated monthly savings",
    whenShown: "Helps prioritize",
    chipBg: "bg-[#FFF3A8]",
    chipInk: "text-[#524305]",
    desc: "Shows realistic dollar savings and regional CO₂e cuts using exact AWS region pricing while preventing double-counted overlapping actions.",
    shape: "clover",
    shapeColor: "text-[#FBE0BC]",
    iconInk: "text-[#6B4814]",
    icon: "calculate",
  },
  {
    subtitle: "After you apply",
    title: "Verified real outcome",
    whenShown: "Confirms the win",
    chipBg: "bg-[#E2F5EF]",
    chipInk: "text-[#155E4B]",
    desc: "Measured once updated AWS billing arrives and response times stay healthy over matched pre/post weeks. Estimates never pretend to be final proof.",
    shape: "flower",
    shapeColor: "text-[#CEECE0]",
    iconInk: "text-[#155E4B]",
    icon: "verified",
  },
];

export const TRUST_GUARDS: { title: string; detail: string }[] = [
  {
    title: "Never touches production on its own",
    detail: "GreenCloud connects strictly read-only. You generate Terraform diffs, review them in Git, and deploy on your schedule.",
  },
  {
    title: "Never hides missing information",
    detail: "If CloudWatch memory stats or team ownership tags aren't set yet, GreenCloud labels the resource for investigation instead of guessing.",
  },
  {
    title: "Never inflates carbon or dollar wins",
    detail: "Provider monthly carbon exports stay separate from modeled estimates, and overlapping fixes never double-count the same savings.",
  },
];
