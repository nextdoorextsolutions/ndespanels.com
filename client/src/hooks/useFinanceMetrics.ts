import { trpc } from '@/lib/trpc';

interface FinanceMetrics {
  totalRevenue: number;
  outstanding: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  totalExpenses: number;
  netProfit: number;
  recentInvoices: Invoice[];
  revenueData: RevenueDataPoint[];
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  address: string;
  amount: number;
  status: string;
  invoiceDate: string;
}

interface RevenueDataPoint {
  name: string;
  income: number;
  expenses: number;
}

export function useFinanceMetrics() {
  // Fetch all invoices using tRPC
  const { data: invoices = [] } = trpc.invoices.getAll.useQuery({});
  
  // Fetch all expenses using tRPC
  const { data: expenses = [] } = trpc.expenses.getAll.useQuery({});

  // Calculate Total Revenue (sum of paid invoices)
  const totalRevenue = (invoices || [])
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || '0'), 0);

  // Calculate Outstanding (sum of sent and overdue invoices)
  const outstanding = (invoices || [])
    .filter((inv: any) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || '0'), 0);

  // Count paid invoices
  const paidInvoicesCount = (invoices || []).filter((inv: any) => inv.status === 'paid').length;

  // Count pending invoices (sent + overdue)
  const pendingInvoicesCount = (invoices || []).filter(
    (inv: any) => inv.status === 'sent' || inv.status === 'overdue'
  ).length;

  // Calculate Total Expenses
  const totalExpenses = (expenses || []).reduce(
    (sum: number, exp: any) => sum + parseFloat(exp.amount || '0'),
    0
  );

  // Calculate Net Profit
  const netProfit = totalRevenue - totalExpenses;

  // Get recent 5 invoices
  const recentInvoices: Invoice[] = (invoices || []).slice(0, 5).map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName,
    address: inv.address || 'N/A',
    amount: parseFloat(inv.totalAmount || '0'),
    status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
    invoiceDate: new Date(inv.invoiceDate).toLocaleDateString(),
  }));

  // Generate revenue data for last 6 months
  const revenueData = generateMonthlyRevenueData(invoices || [], expenses || []);

  return {
    data: {
      totalRevenue,
      outstanding,
      paidInvoicesCount,
      pendingInvoicesCount,
      totalExpenses,
      netProfit,
      recentInvoices,
      revenueData,
    },
    isLoading: false,
  };
}

function generateMonthlyRevenueData(invoices: any[], expenses: any[]): RevenueDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const last6Months: RevenueDataPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const month = date.getMonth();

    // Calculate income for this month (paid invoices)
    const income = invoices
      .filter((inv: any) => {
        if (inv.status !== 'paid' || !inv.paidDate) return false;
        const paidDate = new Date(inv.paidDate);
        return paidDate.getFullYear() === year && paidDate.getMonth() === month;
      })
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || '0'), 0);

    // Calculate expenses for this month
    const expensesAmount = expenses
      .filter((exp: any) => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === year && expDate.getMonth() === month;
      })
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || '0'), 0);

    last6Months.push({
      name: monthName,
      income: Math.round(income),
      expenses: Math.round(expensesAmount),
    });
  }

  return last6Months;
}
