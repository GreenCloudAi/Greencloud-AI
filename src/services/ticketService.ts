export interface TicketPayload {
  recommendationId: string;
  title: string;
  category: string;
  savingsMonthly: number;
  gco2eSavings: number;
  evidenceSummary: string;
  suggestedAction: string;
}

export interface CreatedTicketResult {
  ticketId: string;
  system: "jira" | "github_pr";
  status: "opened" | "pending_approval";
  url: string;
  createdAt: string;
}

export class TicketService {
  /**
   * Creates a ticket or pull request requiring human approval before execution.
   */
  static async createTicket(payload: TicketPayload): Promise<CreatedTicketResult> {
    const mockTicketNumber = Math.floor(1000 + Math.random() * 9000);
    const isPr = payload.category === "rightsizing";

    if (isPr) {
      return {
        ticketId: `PR-${mockTicketNumber}`,
        system: "github_pr",
        status: "pending_approval",
        url: `https://github.com/org/infrastructure/pull/${mockTicketNumber}`,
        createdAt: new Date().toISOString()
      };
    }

    return {
      ticketId: `FINOPS-${mockTicketNumber}`,
      system: "jira",
      status: "opened",
      url: `https://jira.company.com/browse/FINOPS-${mockTicketNumber}`,
      createdAt: new Date().toISOString()
    };
  }
}
