/**
 * GreenCloud AI — Developer Logger & Error Diagnostic Utility
 * Provides pretty-printed, categorized logs with clear 1-line actionable solutions.
 * Automatically masks sensitive tokens (e.g. AWS Keys, Session Tokens).
 */

type LogCategory = "AWS" | "INGEST" | "REC" | "AUTH" | "DB" | "SECURITY" | "API";

interface LogMeta {
  [key: string]: any;
}

export class Logger {
  private static maskSensitive(text: string): string {
    if (!text) return text;
    return text
      .replace(/(AKIA[A-Z0-9]{16})/g, "$1 [MASKED]")
      .replace(/(aws_secret_access_key\s*=\s*)([^\s]+)/gi, "$1********")
      .replace(/(sessionToken["']?\s*:\s*["'])([^"']+)(["'])/gi, "$1***[MASKED]***$3");
  }

  static info(category: LogCategory, action: string, message: string, meta?: LogMeta) {
    const time = new Date().toISOString().substring(11, 19);
    console.log(
      `\x1b[36m[${time}]\x1b[0m \x1b[32m[INFO]\x1b[0m \x1b[35m[${category}]\x1b[0m \x1b[1m${action}\x1b[0m ➜ ${this.maskSensitive(message)}`
    );
    if (meta && Object.keys(meta).length > 0) {
      console.log(`   \x1b[90mMetadata:\x1b[0m`, JSON.stringify(meta, null, 2).replace(/\n/g, "\n   "));
    }
  }

  static warn(category: LogCategory, action: string, message: string, solution?: string, meta?: LogMeta) {
    const time = new Date().toISOString().substring(11, 19);
    console.warn(
      `\x1b[36m[${time}]\x1b[0m \x1b[33m[WARN]\x1b[0m \x1b[35m[${category}]\x1b[0m \x1b[1m${action}\x1b[0m ➜ ${this.maskSensitive(message)}`
    );
    if (solution) {
      console.warn(`   \x1b[33m💡 Quick Solution:\x1b[0m \x1b[1m${solution}\x1b[0m`);
    }
    if (meta && Object.keys(meta).length > 0) {
      console.warn(`   \x1b[90mMetadata:\x1b[0m`, JSON.stringify(meta, null, 2).replace(/\n/g, "\n   "));
    }
  }

  static error(category: LogCategory, action: string, error: any, customSolution?: string, meta?: LogMeta) {
    const time = new Date().toISOString().substring(11, 19);
    const errorMsg = error?.message || error?.toString() || "Unknown error";
    const errorCode = error?.name || error?.Code || "";

    console.error(
      `\x1b[36m[${time}]\x1b[0m \x1b[31m[ERROR]\x1b[0m \x1b[35m[${category}]\x1b[0m \x1b[1m${action}\x1b[0m ✖ ${this.maskSensitive(errorMsg)}`
    );

    // Auto-diagnose known errors with 1-line solutions
    const solution = customSolution || this.diagnoseError(errorCode, errorMsg);
    if (solution) {
      console.error(`   \x1b[32m💡 1-Line Solution:\x1b[0m \x1b[1;92m${solution}\x1b[0m`);
    }

    if (meta && Object.keys(meta).length > 0) {
      console.error(`   \x1b[90mContext:\x1b[0m`, JSON.stringify(meta, null, 2).replace(/\n/g, "\n   "));
    }
  }

  static success(category: LogCategory, action: string, message: string, meta?: LogMeta) {
    const time = new Date().toISOString().substring(11, 19);
    console.log(
      `\x1b[36m[${time}]\x1b[0m \x1b[92m[SUCCESS]\x1b[0m \x1b[35m[${category}]\x1b[0m \x1b[1m${action}\x1b[0m ✔ ${message}`
    );
    if (meta && Object.keys(meta).length > 0) {
      console.log(`   \x1b[90mStats:\x1b[0m`, JSON.stringify(meta, null, 2).replace(/\n/g, "\n   "));
    }
  }

  /**
   * Translates cryptic AWS/Database errors into direct 1-line actionable fixes
   */
  private static diagnoseError(code: string, msg: string): string {
    const lower = (msg + " " + code).toLowerCase();

    if (lower.includes("could not load credentials from any providers")) {
      return "Add AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY to .env.local (or run `aws configure`).";
    }
    if (lower.includes("accessdenied") || lower.includes("unauthorized") || lower.includes("authfailure")) {
      return "Attach 'GreenCloudReadOnlyPolicy' to your IAM Role and ensure sts:ExternalId matches.";
    }
    if (lower.includes("cannot assume role") || lower.includes("not authorized to perform: sts:assumerole")) {
      return "Update IAM Role Trust Policy to allow 'sts:AssumeRole' for your calling AWS account ID.";
    }
    if (lower.includes("cost explorer") && lower.includes("is not enabled")) {
      return "Enable AWS Cost Explorer in the AWS Console (Billing -> Cost Explorer) and wait up to 24h.";
    }
    if (lower.includes("throttling") || lower.includes("requestlimitexceeded")) {
      return "AWS API rate limit reached; GreenCloud will automatically retry with exponential backoff.";
    }
    if (lower.includes("nosuchbucket")) {
      return "Verify the CUR S3 bucket name in your CloudFormation parameters or settings.";
    }
    if (lower.includes("econnrefused") || lower.includes("fetch failed")) {
      return "Check your internet connection or verify the target API endpoint URL.";
    }
    return "Check AWS Console IAM role permissions and verify target region settings in .env.local.";
  }
}
