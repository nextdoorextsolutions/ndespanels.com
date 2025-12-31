/**
 * Statement Parser Utility
 * Handles parsing of bank statements (CSV, Excel, PDF) into transaction data
 */

import { MONTHS } from '@/constants/banking-constants';

export interface TransactionInput {
  transactionDate: string;
  description: string;
  amount: number;
  bankAccount: string;
  referenceNumber?: string;
}

export interface ParseResult {
  transactions: TransactionInput[];
  metadata: {
    fileName: string;
    dateRange?: { start: string; end: string };
    totalAmount: number;
  };
}

/**
 * Parse a bank statement file (CSV, Excel, or PDF) into transactions
 */
export async function parseStatement(
  file: File,
  year?: string,
  month?: string
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  
  const isCSV = fileName.endsWith('.csv');
  const isPDF = fileName.endsWith('.pdf');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  
  if (!isCSV && !isPDF && !isExcel) {
    throw new Error(`File "${file.name}" not recognized. Please upload a CSV, Excel, or PDF file.`);
  }

  if (isCSV || isExcel) {
    return parseCSV(file);
  } else if (isPDF) {
    if (!year || !month) {
      throw new Error('Year and month are required for PDF parsing');
    }
    return parsePDF(file, year, month);
  }

  throw new Error('Unsupported file type');
}

/**
 * Parse CSV/Excel file
 */
async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file is empty or invalid');
        }
        
        console.log('CSV lines:', lines.length);
        console.log('First line (header):', lines[0]);
        console.log('Second line (sample):', lines[1]);
        
        // Parse header to find column indices
        const header = lines[0].toLowerCase();
        const headerCols = header.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        console.log('Header columns:', headerCols);
        
        // Find column indices (Chase CSV has: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #)
        const dateIdx = headerCols.findIndex(h => h.includes('date') || h.includes('posting'));
        const descIdx = headerCols.findIndex(h => h.includes('description'));
        const amountIdx = headerCols.findIndex(h => h.includes('amount'));
        
        console.log('Column indices - Date:', dateIdx, 'Description:', descIdx, 'Amount:', amountIdx);
        
        // Parse transactions
        const transactions = lines.slice(1).map((line, idx) => {
          try {
            // Handle CSV with quoted fields
            const cols: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                cols.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            cols.push(current.trim());
            
            const date = cols[dateIdx] || '';
            const description = cols[descIdx] || 'Unknown Transaction';
            const amountStr = cols[amountIdx] || '0';
            
            // Parse date from MM/DD/YYYY to YYYY-MM-DD
            let parsedDate = date;
            if (date && date.includes('/')) {
              const dateParts = date.split('/');
              if (dateParts.length === 3) {
                const [month, day, year] = dateParts;
                parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }
            
            // Parse amount (remove $ and commas)
            const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
            
            return {
              transactionDate: parsedDate,
              description: description.replace(/^"|"$/g, ''),
              amount: amount,
              bankAccount: 'Chase Business Checking',
            };
          } catch (err) {
            console.error('Error parsing line', idx, ':', err);
            return null;
          }
        }).filter((t): t is TransactionInput => t !== null && t !== undefined && t.amount !== 0);

        console.log('Parsed transactions:', transactions.length);
        
        if (transactions.length === 0) {
          throw new Error('No valid transactions found in CSV');
        }

        // Calculate metadata
        const dates = transactions.map(t => new Date(t.transactionDate)).filter(d => !isNaN(d.getTime()));
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        
        const metadata = {
          fileName: file.name,
          dateRange: dates.length > 0 ? {
            start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
            end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
          } : undefined,
          totalAmount,
        };

        resolve({ transactions, metadata });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse PDF file
 */
async function parsePDF(file: File, year: string, month: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Extract text from PDF
        const uint8Array = new Uint8Array(arrayBuffer);
        let text = '';
        
        for (let i = 0; i < uint8Array.length; i++) {
          const char = uint8Array[i];
          if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
            text += String.fromCharCode(char);
          }
        }
        
        console.log('Extracted text length:', text.length);
        
        const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
        const transactions: TransactionInput[] = [];
        
        // Pattern matching for Chase statements
        const pattern1 = /(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/;
        const pattern2 = /(\d{2}\/\d{2})\s+(.+?)([\d,]+\.\d{2})/;
        
        let isDepositsSection = false;
        let isChecksSection = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Track sections
          if (line.includes('DEPOSITS') && line.includes('ADDITIONS')) {
            isDepositsSection = true;
            isChecksSection = false;
            continue;
          }
          if (line.includes('CHECKS') && line.includes('PAID')) {
            isDepositsSection = false;
            isChecksSection = true;
            continue;
          }
          if (line.includes('Total Deposits') || line.includes('Total Checks')) {
            isDepositsSection = false;
            isChecksSection = false;
            continue;
          }
          
          if (!isDepositsSection && !isChecksSection) continue;
          
          const match = line.match(pattern1) || line.match(pattern2);
          
          if (match) {
            const [, dateStr, description, amountStr] = match;
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            
            if (amount > 0 && dateStr.match(/^\d{2}\/\d{2}$/)) {
              const [monthPart, day] = dateStr.split('/');
              const fullDate = `${year}-${monthPart.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              transactions.push({
                transactionDate: fullDate,
                description: description.trim().substring(0, 200),
                amount: isChecksSection ? -amount : amount,
                bankAccount: 'Chase Business Checking',
              });
            }
          }
        }
        
        if (transactions.length === 0) {
          throw new Error('No valid transactions found in PDF');
        }

        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const metadata = {
          fileName: file.name,
          dateRange: transactions.length > 0 ? {
            start: transactions[0].transactionDate,
            end: transactions[transactions.length - 1].transactionDate,
          } : undefined,
          totalAmount,
        };

        resolve({ transactions, metadata });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
