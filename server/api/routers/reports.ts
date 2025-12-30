import { z } from "zod";
import { eq, desc, and, gte, lte, sql, isNull, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  reportRequests, 
  users, 
  inventoryTransactions, 
  billsPayable, 
  bankTransactions,
  invoices,
  activities
} from "../../../drizzle/schema";

export const reportsRouter = router({
  
  // ============================================================================
  // 1. JOB PROFITABILITY REPORTS
  // ============================================================================
  
  /**
   * Get profitability by crew/assigned user
   */
  getProfitabilityByCrew: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH job_costs AS (
          SELECT 
            rr.id as job_id,
            rr.full_name as customer_name,
            rr.assigned_to,
            u.name as crew_name,
            COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0) as total_revenue,
            COALESCE((
              SELECT SUM(it.quantity * it.unit_cost)
              FROM inventory_transactions it
              WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
            ), 0) as material_costs,
            COALESCE((
              SELECT SUM(bp.total_amount)
              FROM bills_payable bp
              WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
            ), 0) as vendor_costs,
            COALESCE((
              SELECT SUM(ABS(bt.amount))
              FROM bank_transactions bt
              WHERE bt.project_id = rr.id AND bt.amount < 0 AND bt.status = 'reconciled'
            ), 0) as other_costs
          FROM report_requests rr
          LEFT JOIN users u ON rr.assigned_to = u.id
          WHERE rr.status IN ('completed', 'invoiced', 'closed_deal')
            AND rr.approved_amount IS NOT NULL
            ${input.startDate ? sql`AND rr.completed_date >= ${input.startDate}` : sql``}
            ${input.endDate ? sql`AND rr.completed_date <= ${input.endDate}` : sql``}
        )
        SELECT 
          assigned_to as user_id,
          crew_name,
          COUNT(*)::int as total_jobs,
          SUM(total_revenue)::numeric as total_revenue,
          SUM(material_costs + vendor_costs + other_costs)::numeric as total_costs,
          (SUM(total_revenue) - SUM(material_costs + vendor_costs + other_costs))::numeric as gross_profit,
          CASE 
            WHEN SUM(total_revenue) > 0 
            THEN ROUND(((SUM(total_revenue) - SUM(material_costs + vendor_costs + other_costs)) / SUM(total_revenue) * 100)::numeric, 2)
            ELSE 0 
          END as profit_margin_percent
        FROM job_costs
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to, crew_name
        ORDER BY gross_profit DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get profitability by deal type (Insurance, Cash, Financed)
   */
  getProfitabilityByDealType: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH job_costs AS (
          SELECT 
            rr.id as job_id,
            rr.deal_type,
            COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0) as total_revenue,
            COALESCE((
              SELECT SUM(it.quantity * it.unit_cost)
              FROM inventory_transactions it
              WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
            ), 0) +
            COALESCE((
              SELECT SUM(bp.total_amount)
              FROM bills_payable bp
              WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
            ), 0) +
            COALESCE((
              SELECT SUM(ABS(bt.amount))
              FROM bank_transactions bt
              WHERE bt.project_id = rr.id AND bt.amount < 0 AND bt.status = 'reconciled'
            ), 0) as total_costs
          FROM report_requests rr
          WHERE rr.status IN ('completed', 'invoiced', 'closed_deal')
            AND rr.approved_amount IS NOT NULL
            AND rr.deal_type IS NOT NULL
            ${input.startDate ? sql`AND rr.completed_date >= ${input.startDate}` : sql``}
            ${input.endDate ? sql`AND rr.completed_date <= ${input.endDate}` : sql``}
        )
        SELECT 
          deal_type,
          COUNT(*)::int as total_jobs,
          SUM(total_revenue)::numeric as total_revenue,
          SUM(total_costs)::numeric as total_costs,
          (SUM(total_revenue - total_costs))::numeric as gross_profit,
          CASE 
            WHEN SUM(total_revenue) > 0 
            THEN ROUND(((SUM(total_revenue - total_costs) / SUM(total_revenue)) * 100)::numeric, 2)
            ELSE 0 
          END as profit_margin_percent,
          ROUND((SUM(total_revenue) / COUNT(*))::numeric, 2) as avg_revenue_per_job,
          ROUND((SUM(total_costs) / COUNT(*))::numeric, 2) as avg_cost_per_job
        FROM job_costs
        GROUP BY deal_type
        ORDER BY gross_profit DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  // ============================================================================
  // 2. WIP (WORK IN PROGRESS) REPORT
  // ============================================================================

  /**
   * Get Over/Under Billing Report
   */
  getWIPReport: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH job_financials AS (
          SELECT 
            rr.id as job_id,
            rr.full_name as customer_name,
            rr.address,
            rr.status,
            rr.deal_type,
            u.name as assigned_to_name,
            COALESCE(rr.approved_amount, rr.total_price, 0) as contract_value,
            COALESCE(rr.total_price, 0) * 0.60 as estimated_costs,
            COALESCE((
              SELECT SUM(it.quantity * it.unit_cost)
              FROM inventory_transactions it
              WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
            ), 0) +
            COALESCE((
              SELECT SUM(bp.total_amount)
              FROM bills_payable bp
              WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
            ), 0) +
            COALESCE((
              SELECT SUM(ABS(bt.amount))
              FROM bank_transactions bt
              WHERE bt.project_id = rr.id AND bt.amount < 0 AND bt.status = 'reconciled'
            ), 0) as actual_costs,
            COALESCE(rr.amount_paid, 0) as billings_to_date
          FROM report_requests rr
          LEFT JOIN users u ON rr.assigned_to = u.id
          WHERE rr.status IN ('approved', 'project_scheduled', 'completed')
            AND (rr.approved_amount IS NOT NULL OR rr.total_price IS NOT NULL)
        )
        SELECT 
          job_id,
          customer_name,
          address,
          status,
          deal_type,
          assigned_to_name,
          contract_value::numeric,
          estimated_costs::numeric,
          actual_costs::numeric,
          billings_to_date::numeric,
          CASE 
            WHEN estimated_costs > 0 
            THEN ROUND((actual_costs / estimated_costs * 100)::numeric, 2)
            ELSE 0 
          END as percent_complete,
          CASE 
            WHEN estimated_costs > 0 
            THEN ROUND((contract_value * (actual_costs / estimated_costs))::numeric, 2)
            ELSE 0 
          END as earned_revenue,
          (billings_to_date - 
            CASE 
              WHEN estimated_costs > 0 
              THEN ROUND((contract_value * (actual_costs / estimated_costs))::numeric, 2)
              ELSE 0 
            END)::numeric as over_under_billed,
          CASE 
            WHEN (billings_to_date - 
              CASE 
                WHEN estimated_costs > 0 
                THEN ROUND((contract_value * (actual_costs / estimated_costs))::numeric, 2)
                ELSE 0 
              END) > 0 
            THEN 'Overbilled - Cash Rich, Owe Work'
            WHEN (billings_to_date - 
              CASE 
                WHEN estimated_costs > 0 
                THEN ROUND((contract_value * (actual_costs / estimated_costs))::numeric, 2)
                ELSE 0 
              END) < 0 
            THEN 'Underbilled - Financing Customer'
            ELSE 'Balanced'
          END as billing_status
        FROM job_financials
        ORDER BY over_under_billed DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  // ============================================================================
  // 3. AR/AP AGING REPORTS
  // ============================================================================

  /**
   * Get AR Aging Detail Report
   */
  getARAgingDetail: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH invoice_aging AS (
          SELECT 
            i.id as invoice_id,
            i.invoice_number,
            i.client_name,
            i.client_email,
            i.client_phone,
            i.total_amount,
            i.status,
            i.invoice_date,
            i.due_date,
            CASE 
              WHEN i.status != 'paid' 
              THEN EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer
              ELSE 0 
            END as days_overdue,
            (
              SELECT a.description
              FROM activities a
              WHERE a.report_request_id = i.report_request_id
                AND a.activity_type IN ('call_logged', 'note_added', 'email_sent')
              ORDER BY a.created_at DESC
              LIMIT 1
            ) as last_contact_note,
            (
              SELECT a.created_at
              FROM activities a
              WHERE a.report_request_id = i.report_request_id
                AND a.activity_type IN ('call_logged', 'note_added', 'email_sent')
              ORDER BY a.created_at DESC
              LIMIT 1
            ) as last_contact_date
          FROM invoices i
          WHERE i.status IN ('sent', 'overdue')
        )
        SELECT 
          invoice_id,
          invoice_number,
          client_name,
          client_email,
          client_phone,
          total_amount::numeric,
          status,
          invoice_date,
          due_date,
          days_overdue,
          CASE 
            WHEN days_overdue <= 0 THEN 'Current'
            WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30 Days'
            WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60 Days'
            WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90 Days'
            ELSE '90+ Days'
          END as aging_bucket,
          last_contact_note,
          last_contact_date,
          CASE 
            WHEN last_contact_date IS NOT NULL 
            THEN EXTRACT(DAY FROM (CURRENT_DATE - last_contact_date::date))::integer
            ELSE NULL 
          END as days_since_contact
        FROM invoice_aging
        ORDER BY days_overdue DESC, total_amount DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get AR Aging Summary (by bucket)
   */
  getARAgingSummary: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH invoice_aging AS (
          SELECT 
            i.total_amount,
            CASE 
              WHEN i.status = 'paid' THEN 0
              ELSE EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer
            END as days_overdue
          FROM invoices i
          WHERE i.status IN ('sent', 'overdue')
        )
        SELECT 
          'Current' as aging_bucket,
          COUNT(*) FILTER (WHERE days_overdue <= 0)::int as invoice_count,
          COALESCE(SUM(total_amount) FILTER (WHERE days_overdue <= 0), 0)::numeric as total_amount
        FROM invoice_aging
        UNION ALL
        SELECT 
          '1-30 Days' as aging_bucket,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 1 AND 30)::int as invoice_count,
          COALESCE(SUM(total_amount) FILTER (WHERE days_overdue BETWEEN 1 AND 30), 0)::numeric as total_amount
        FROM invoice_aging
        UNION ALL
        SELECT 
          '31-60 Days' as aging_bucket,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 31 AND 60)::int as invoice_count,
          COALESCE(SUM(total_amount) FILTER (WHERE days_overdue BETWEEN 31 AND 60), 0)::numeric as total_amount
        FROM invoice_aging
        UNION ALL
        SELECT 
          '61-90 Days' as aging_bucket,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 61 AND 90)::int as invoice_count,
          COALESCE(SUM(total_amount) FILTER (WHERE days_overdue BETWEEN 61 AND 90), 0)::numeric as total_amount
        FROM invoice_aging
        UNION ALL
        SELECT 
          '90+ Days' as aging_bucket,
          COUNT(*) FILTER (WHERE days_overdue > 90)::int as invoice_count,
          COALESCE(SUM(total_amount) FILTER (WHERE days_overdue > 90), 0)::numeric as total_amount
        FROM invoice_aging
        ORDER BY 
          CASE aging_bucket
            WHEN 'Current' THEN 1
            WHEN '1-30 Days' THEN 2
            WHEN '31-60 Days' THEN 3
            WHEN '61-90 Days' THEN 4
            WHEN '90+ Days' THEN 5
          END
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get AP Aging Report
   */
  getAPAging: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH bill_aging AS (
          SELECT 
            bp.id as bill_id,
            bp.bill_number,
            bp.vendor_name,
            bp.vendor_email,
            bp.vendor_phone,
            bp.total_amount,
            bp.status,
            bp.bill_date,
            bp.due_date,
            bp.category,
            EXTRACT(DAY FROM (bp.due_date - CURRENT_DATE))::integer as days_until_due,
            rr.full_name as project_customer,
            rr.address as project_address
          FROM bills_payable bp
          LEFT JOIN report_requests rr ON bp.project_id = rr.id
          WHERE bp.status IN ('pending', 'approved', 'overdue')
        )
        SELECT 
          bill_id,
          bill_number,
          vendor_name,
          vendor_email,
          vendor_phone,
          total_amount::numeric,
          status,
          bill_date,
          due_date,
          category,
          days_until_due,
          project_customer,
          project_address,
          CASE 
            WHEN days_until_due >= 0 THEN 'Not Yet Due'
            WHEN days_until_due BETWEEN -30 AND -1 THEN '1-30 Days Overdue'
            WHEN days_until_due BETWEEN -60 AND -31 THEN '31-60 Days Overdue'
            WHEN days_until_due BETWEEN -90 AND -61 THEN '61-90 Days Overdue'
            ELSE '90+ Days Overdue'
          END as aging_bucket
        FROM bill_aging
        ORDER BY days_until_due ASC, total_amount DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  // ============================================================================
  // 4. SALES & COMMISSION REPORTS
  // ============================================================================

  /**
   * Get Commission Clawback Report
   */
  getCommissionClawback: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH job_performance AS (
          SELECT 
            rr.id as job_id,
            rr.full_name as customer_name,
            rr.address,
            rr.assigned_to,
            u.name as sales_rep_name,
            rr.sales_rep_code,
            COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0) as total_revenue,
            COALESCE(rr.approved_amount, 0) * 0.40 as estimated_profit,
            COALESCE((
              SELECT SUM(it.quantity * it.unit_cost)
              FROM inventory_transactions it
              WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
            ), 0) +
            COALESCE((
              SELECT SUM(bp.total_amount)
              FROM bills_payable bp
              WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
            ), 0) +
            COALESCE((
              SELECT SUM(ABS(bt.amount))
              FROM bank_transactions bt
              WHERE bt.project_id = rr.id AND bt.amount < 0 AND bt.status = 'reconciled'
            ), 0) as actual_costs,
            (COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0)) * 0.10 as commission_paid,
            rr.completed_date
          FROM report_requests rr
          LEFT JOIN users u ON rr.assigned_to = u.id
          WHERE rr.status IN ('completed', 'invoiced', 'closed_deal')
            AND rr.approved_amount IS NOT NULL
            AND rr.completed_date >= CURRENT_DATE - INTERVAL '90 days'
        )
        SELECT 
          job_id,
          customer_name,
          address,
          sales_rep_name,
          sales_rep_code,
          total_revenue::numeric,
          actual_costs::numeric,
          (total_revenue - actual_costs)::numeric as actual_profit,
          ROUND((estimated_profit / total_revenue * 100)::numeric, 2) as estimated_margin_percent,
          ROUND(((total_revenue - actual_costs) / total_revenue * 100)::numeric, 2) as actual_margin_percent,
          commission_paid::numeric,
          CASE 
            WHEN total_revenue > 0 
            THEN ROUND((commission_paid * ((total_revenue - actual_costs) / estimated_profit))::numeric, 2)
            ELSE 0 
          END as adjusted_commission,
          (commission_paid - 
            CASE 
              WHEN total_revenue > 0 
              THEN ROUND((commission_paid * ((total_revenue - actual_costs) / estimated_profit))::numeric, 2)
              ELSE 0 
            END)::numeric as clawback_amount,
          completed_date
        FROM job_performance
        WHERE (total_revenue - actual_costs) < estimated_profit * 0.80
        ORDER BY clawback_amount DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get Lead Source ROI Report
   */
  getLeadSourceROI: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH lead_source_performance AS (
          SELECT 
            rr.lead_source,
            COUNT(*)::int as total_leads,
            COUNT(*) FILTER (WHERE rr.status IN ('completed', 'invoiced', 'closed_deal'))::int as closed_deals,
            SUM(
              CASE 
                WHEN rr.status IN ('completed', 'invoiced', 'closed_deal')
                THEN COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0)
                ELSE 0 
              END
            ) as total_revenue,
            SUM(
              CASE 
                WHEN rr.status IN ('completed', 'invoiced', 'closed_deal')
                THEN 
                  COALESCE((
                    SELECT SUM(it.quantity * it.unit_cost)
                    FROM inventory_transactions it
                    WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
                  ), 0) +
                  COALESCE((
                    SELECT SUM(bp.total_amount)
                    FROM bills_payable bp
                    WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
                  ), 0)
                ELSE 0 
              END
            ) as total_costs
          FROM report_requests rr
          WHERE rr.created_at >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY rr.lead_source
        )
        SELECT 
          lead_source,
          total_leads,
          closed_deals,
          ROUND((closed_deals::numeric / NULLIF(total_leads, 0) * 100), 2) as close_rate_percent,
          total_revenue::numeric,
          total_costs::numeric,
          (total_revenue - total_costs)::numeric as gross_profit,
          CASE 
            WHEN lead_source IN ('google', 'facebook', 'paid_ads') 
            THEN (total_leads * 50)::numeric
            ELSE 0 
          END as marketing_spend,
          CASE 
            WHEN closed_deals > 0 AND lead_source IN ('google', 'facebook', 'paid_ads')
            THEN ROUND((total_leads * 50.0 / closed_deals)::numeric, 2)
            ELSE 0 
          END as customer_acquisition_cost,
          CASE 
            WHEN lead_source IN ('google', 'facebook', 'paid_ads') AND (total_leads * 50) > 0
            THEN ROUND((((total_revenue - total_costs) - (total_leads * 50)) / (total_leads * 50) * 100)::numeric, 2)
            ELSE NULL 
          END as roi_percent
        FROM lead_source_performance
        ORDER BY gross_profit DESC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  // ============================================================================
  // 5. QUICK WIN WIDGETS
  // ============================================================================

  /**
   * Get Cash Burn Rate
   */
  getCashBurnRate: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH weekly_expenses AS (
          SELECT 
            AVG(weekly_total) as avg_weekly_expense
          FROM (
            SELECT 
              DATE_TRUNC('week', bp.bill_date) as week,
              SUM(bp.total_amount) as weekly_total
            FROM bills_payable bp
            WHERE bp.status = 'paid'
              AND bp.bill_date >= CURRENT_DATE - INTERVAL '8 weeks'
            GROUP BY DATE_TRUNC('week', bp.bill_date)
          ) weekly_totals
        ),
        current_cash AS (
          SELECT 
            SUM(
              CASE 
                WHEN bt.amount > 0 THEN bt.amount
                ELSE 0 
              END
            ) - 
            SUM(
              CASE 
                WHEN bt.amount < 0 THEN ABS(bt.amount)
                ELSE 0 
              END
            ) as bank_balance
          FROM bank_transactions bt
          WHERE bt.status = 'reconciled'
        )
        SELECT 
          ROUND(cc.bank_balance::numeric, 2) as current_bank_balance,
          ROUND(we.avg_weekly_expense::numeric, 2) as avg_weekly_expenses,
          CASE 
            WHEN we.avg_weekly_expense > 0 
            THEN ROUND((cc.bank_balance / we.avg_weekly_expense)::numeric, 1)
            ELSE 999 
          END as weeks_of_runway
        FROM current_cash cc, weekly_expenses we
      `;

      const result = await db.execute(query);
      return result.rows[0] || { current_bank_balance: 0, avg_weekly_expenses: 0, weeks_of_runway: 0 };
    }),

  /**
   * Get The Red List (cost overruns)
   */
  getRedList: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH job_cost_overruns AS (
          SELECT 
            rr.id as job_id,
            rr.full_name as customer_name,
            rr.address,
            rr.status,
            u.name as project_manager,
            COALESCE(rr.approved_amount, rr.total_price, 0) * 0.60 as estimated_costs,
            COALESCE((
              SELECT SUM(it.quantity * it.unit_cost)
              FROM inventory_transactions it
              WHERE it.project_id = rr.id AND it.transaction_type = 'usage'
            ), 0) +
            COALESCE((
              SELECT SUM(bp.total_amount)
              FROM bills_payable bp
              WHERE bp.project_id = rr.id AND bp.status IN ('paid', 'approved')
            ), 0) +
            COALESCE((
              SELECT SUM(ABS(bt.amount))
              FROM bank_transactions bt
              WHERE bt.project_id = rr.id AND bt.amount < 0 AND bt.status = 'reconciled'
            ), 0) as actual_costs,
            rr.created_at
          FROM report_requests rr
          LEFT JOIN users u ON rr.assigned_to = u.id
          WHERE rr.status IN ('project_scheduled', 'completed', 'invoiced')
            AND (rr.approved_amount IS NOT NULL OR rr.total_price IS NOT NULL)
        )
        SELECT 
          job_id,
          customer_name,
          address,
          status,
          project_manager,
          ROUND(estimated_costs::numeric, 2) as estimated_costs,
          ROUND(actual_costs::numeric, 2) as actual_costs,
          ROUND((actual_costs - estimated_costs)::numeric, 2) as cost_overrun,
          ROUND(((actual_costs - estimated_costs) / NULLIF(estimated_costs, 0) * 100)::numeric, 2) as overrun_percent,
          created_at
        FROM job_cost_overruns
        WHERE actual_costs > estimated_costs
        ORDER BY cost_overrun DESC
        LIMIT 20
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get Unbilled Revenue
   */
  getUnbilledRevenue: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH completed_unbilled AS (
          SELECT 
            rr.id as job_id,
            rr.full_name as customer_name,
            rr.address,
            rr.status,
            u.name as assigned_to,
            COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0) as job_value,
            rr.completed_date,
            (
              SELECT COUNT(*)
              FROM invoices i
              WHERE i.report_request_id = rr.id
            ) as invoice_count
          FROM report_requests rr
          LEFT JOIN users u ON rr.assigned_to = u.id
          WHERE rr.status = 'completed'
            AND rr.completed_date IS NOT NULL
        )
        SELECT 
          job_id,
          customer_name,
          address,
          assigned_to,
          job_value::numeric,
          completed_date,
          EXTRACT(DAY FROM (CURRENT_DATE - completed_date))::integer as days_since_completion
        FROM completed_unbilled
        WHERE invoice_count = 0
        ORDER BY completed_date ASC
      `;

      const result = await db.execute(query);
      return result.rows;
    }),

  /**
   * Get Unbilled Revenue Summary
   */
  getUnbilledRevenueSummary: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const query = sql`
        WITH completed_unbilled AS (
          SELECT 
            COALESCE(rr.approved_amount, 0) + COALESCE(rr.extras_charged, 0) as job_value
          FROM report_requests rr
          WHERE rr.status = 'completed'
            AND rr.completed_date IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM invoices i WHERE i.report_request_id = rr.id
            )
        )
        SELECT 
          COUNT(*)::int as unbilled_job_count,
          ROUND(SUM(job_value)::numeric, 2) as total_unbilled_revenue
        FROM completed_unbilled
      `;

      const result = await db.execute(query);
      return result.rows[0] || { unbilled_job_count: 0, total_unbilled_revenue: 0 };
    }),
});
