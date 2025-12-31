import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface BillCSVImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedBill {
  orderPlacedDate: string;
  orderNumber: string;
  orderStatus: string;
  vendorPO: string;
  jobName: string;
  shippingAddress: string;
  memberItemNumber: string;
  itemDescription: string;
  unitOfMeasure: string;
  unitPrice: number;
  shippedExtendedTotal: number;
  otherCharges: number;
  tax: number;
  subTotal: number;
  total: number;
}

export function BillCSVImport({ open, onOpenChange }: BillCSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedBills, setParsedBills] = useState<ParsedBill[]>([]);
  const [consolidatedBills, setConsolidatedBills] = useState<any[]>([]);
  const [matchedBills, setMatchedBills] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'matching' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const bulkImport = trpc.bills.bulkImport.useMutation({
    onSuccess: () => {
      utils.bills.invalidate();
      setStep('complete');
      toast.success('Bills imported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import bills');
      setIsProcessing(false);
    },
  });

  const matchBillsWithTransactions = trpc.bills.matchWithTransactions.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const bills: ParsedBill[] = results.data.map((row: any) => ({
          orderPlacedDate: row['OrderPlacedDate'] || row['Order Placed Date'] || '',
          orderNumber: row['OrderNumber'] || row['Order Number'] || '',
          orderStatus: row['OrderStatus'] || row['Order Status'] || '',
          vendorPO: row['VendorPO'] || row['Vendor PO'] || '',
          jobName: row['JobName'] || row['Job Name'] || '',
          shippingAddress: row['ShippingAddress'] || row['Shipping Address'] || '',
          memberItemNumber: row['MemberItemNumber'] || row['Member Item Number'] || '',
          itemDescription: row['ItemDescription'] || row['Item Description'] || '',
          unitOfMeasure: row['UnitOfMeasure'] || row['Unit of Measure'] || '',
          unitPrice: parseFloat(row['UnitPrice'] || row['Unit Price'] || '0'),
          shippedExtendedTotal: parseFloat(row['ShippedExtendedTotal'] || row['Shipped Extended Total'] || '0'),
          otherCharges: parseFloat(row['OtherCharges'] || row['Other Charges'] || '0'),
          tax: parseFloat(row['Tax'] || '0'),
          subTotal: parseFloat(row['SubTotal'] || row['Sub Total'] || '0'),
          total: parseFloat(row['Total'] || '0'),
        }));

        setParsedBills(bills);
        consolidateBills(bills);
        setIsProcessing(false);
        setStep('preview');
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
        setIsProcessing(false);
      },
    });
  };

  const consolidateBills = (bills: ParsedBill[]) => {
    // Group by order number to consolidate line items
    const grouped = bills.reduce((acc, bill) => {
      const key = bill.orderNumber;
      if (!acc[key]) {
        acc[key] = {
          orderNumber: bill.orderNumber,
          orderPlacedDate: bill.orderPlacedDate,
          orderStatus: bill.orderStatus,
          vendorPO: bill.vendorPO,
          jobName: bill.jobName,
          shippingAddress: bill.shippingAddress,
          lineItems: [],
          totalAmount: 0,
          taxAmount: 0,
        };
      }
      
      acc[key].lineItems.push({
        description: bill.itemDescription,
        quantity: 1,
        unitPrice: bill.unitPrice,
        amount: bill.shippedExtendedTotal,
      });
      
      acc[key].totalAmount += bill.total;
      acc[key].taxAmount += bill.tax;
      
      return acc;
    }, {} as Record<string, any>);

    const consolidated = Object.values(grouped).map((group: any) => ({
      billNumber: group.orderNumber,
      vendorName: group.jobName.includes('MENCH') ? 'Menards' : 
                  group.jobName.includes('CARCANA') ? 'Carcana' : 
                  group.jobName.split(' ')[0],
      billDate: group.orderPlacedDate,
      dueDate: group.orderPlacedDate, // Same as bill date for now
      amount: (group.totalAmount - group.taxAmount).toFixed(2),
      taxAmount: group.taxAmount.toFixed(2),
      totalAmount: group.totalAmount.toFixed(2),
      category: 'materials',
      status: group.orderStatus.toLowerCase() === 'invoiced' ? 'pending' : 
              group.orderStatus.toLowerCase() === 'pending' ? 'pending' : 'approved',
      lineItems: group.lineItems,
      notes: `Imported from Beacon CSV. PO: ${group.vendorPO}. Address: ${group.shippingAddress}`,
    }));

    setConsolidatedBills(consolidated);
  };

  const handleMatchWithTransactions = async () => {
    setIsProcessing(true);
    setStep('matching');

    try {
      const result = await matchBillsWithTransactions.mutateAsync({
        bills: consolidatedBills,
      });

      setMatchedBills(result.matched || []);
      toast.success(`Matched ${result.matchedCount || 0} bills with existing bank transactions`);
      setIsProcessing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to match bills');
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);

    await bulkImport.mutateAsync({
      bills: consolidatedBills.map(bill => ({
        ...bill,
        // Mark as paid if matched with transaction
        status: matchedBills.some(m => m.billNumber === bill.billNumber) ? 'paid' : bill.status,
      })),
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedBills([]);
    setConsolidatedBills([]);
    setMatchedBills([]);
    setStep('upload');
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a20] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1a1a20] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Upload className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import Bills from CSV</h2>
              <p className="text-sm text-zinc-400">Bulk import bills from Beacon export</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="text-zinc-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer"
              >
                <Upload className="mx-auto text-purple-400 mb-4" size={48} />
                <p className="text-white font-medium mb-2">Click to upload CSV file</p>
                <p className="text-sm text-zinc-400">Beacon bill export format supported</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-3 text-purple-400">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing CSV...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle size={20} />
                  <span className="font-medium">
                    Parsed {parsedBills.length} line items → Consolidated into {consolidatedBills.length} bills
                  </span>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <AlertCircle size={18} />
                  <span className="font-medium text-sm">AI Bill Matching Available</span>
                </div>
                <p className="text-xs text-cyan-300 ml-6">
                  Click "Match with Bank Transactions" to have AI check if any of these bills have already been paid via your bank account. 
                  Matched bills will be automatically marked as "Paid" during import.
                </p>
              </div>

              {/* Preview Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr className="text-left text-zinc-400">
                        <th className="px-4 py-3">Bill #</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {consolidatedBills.map((bill, idx) => (
                        <tr key={idx} className="text-white hover:bg-white/5">
                          <td className="px-4 py-3 font-mono text-xs">{bill.billNumber}</td>
                          <td className="px-4 py-3">{bill.vendorName}</td>
                          <td className="px-4 py-3 text-zinc-400">{bill.billDate}</td>
                          <td className="px-4 py-3 text-zinc-400">{bill.lineItems.length} items</td>
                          <td className="px-4 py-3 font-mono">${parseFloat(bill.totalAmount).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">
                              {bill.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMatchWithTransactions}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Matching...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Match with Bank Transactions
                    </>
                  )}
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Import {consolidatedBills.length} Bills
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Matching */}
          {step === 'matching' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-cyan-400 py-12">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-lg">AI is matching bills with bank transactions...</span>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="space-y-4 text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white">Import Complete!</h3>
              <p className="text-zinc-400">
                Successfully imported {consolidatedBills.length} bills
                {matchedBills.length > 0 && ` (${matchedBills.length} matched with bank transactions)`}
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all mx-auto"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
