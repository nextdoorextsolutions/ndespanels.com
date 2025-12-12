export interface ClaimInfo {
  carrier: string;
  claim_number: string;
  loss_date: string;
  total_rcv: number;
  total_acv: number;
  deductible: number;
}

export interface LineItemSummary {
  category: string;
  total_cost: number;
  description: string;
}

export interface AuditFlag {
  severity: "HIGH" | "MEDIUM" | "LOW";
  issue: string;
  description: string;
}

export interface AuditResult {
  claim_info: ClaimInfo;
  line_items_summary: LineItemSummary[];
  audit_flags: AuditFlag[];
  estimator_notes: string;
}
