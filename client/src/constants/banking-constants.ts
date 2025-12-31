/**
 * Banking Constants
 * Centralized constants for the banking module
 */

export const DEFAULT_CATEGORIES = [
  'Materials',
  'Labor',
  'Fuel',
  'Permit Fees',
  'Marketing',
  'Rent',
  'Insurance',
  'Miscellaneous',
  'Income'
];

export const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const YEARS = ['2024', '2025', '2026', '2027'];

export const AI_BATCH_SIZE = 50;

export type ViewMode = 'summary' | 'detailed' | 'category' | 'monthly' | 'accounts';

export interface BankAccountType {
  id: number;
  accountName: string;
  accountType: string;
  accountNumberLast4?: string | null;
  institutionName?: string | null;
  creditLimit?: string | null;
  currentBalance?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
}
