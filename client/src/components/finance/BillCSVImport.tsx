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
  const [isDragging, setIsDragging] = useState(false);
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
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
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
        await consolidateBills(bills);
        setIsProcessing(false);
        setStep('preview');
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
        setIsProcessing(false);
      },
    });
  };

  // Smart category mapping based on item descriptions
  const categorizeMaterial = (description: string): string => {
    const desc = description.toLowerCase();
    
    // Roofing Materials
    if (desc.includes('shingle') || desc.includes('underlayment') || desc.includes('felt') || 
        desc.includes('ice & water') || desc.includes('ice and water') || desc.includes('starter')) {
      return 'roofing_materials';
    }
    
    // Fasteners
    if (desc.includes('nail') || desc.includes('screw') || desc.includes('staple') || 
        desc.includes('fastener') || desc.includes('coil')) {
      return 'fasteners';
    }
    
    // Flashing & Metal
    if (desc.includes('flashing') || desc.includes('drip edge') || desc.includes('valley') || 
        desc.includes('ridge vent') || desc.includes('pipe boot')) {
      return 'flashing_metal';
    }
    
    // Ventilation
    if (desc.includes('vent') || desc.includes('soffit') || desc.includes('intake')) {
      return 'ventilation';
    }
    
    // Lumber & Decking
    if (desc.includes('plywood') || desc.includes('osb') || desc.includes('lumber') || 
        desc.includes('2x4') || desc.includes('2x6') || desc.includes('decking')) {
      return 'lumber_decking';
    }
    
    // Sealants & Adhesives
    if (desc.includes('caulk') || desc.includes('sealant') || desc.includes('adhesive') || 
        desc.includes('cement') || desc.includes('tar')) {
      return 'sealants';
    }
    
    // Default to general materials
    return 'materials';
  };

  const consolidateBills = async (bills: ParsedBill[]) => {
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
          categoryBreakdown: {} as Record<string, number>,
        };
      }
      
      const category = categorizeMaterial(bill.itemDescription);
      
      acc[key].lineItems.push({
        description: bill.itemDescription,
        quantity: 1,
        unitPrice: bill.unitPrice,
        amount: bill.shippedExtendedTotal,
        category,
      });
      
      // Track category breakdown
      acc[key].categoryBreakdown[category] = (acc[key].categoryBreakdown[category] || 0) + bill.shippedExtendedTotal;
      
      acc[key].totalAmount += bill.total;
      acc[key].taxAmount += bill.tax;
      
      return acc;
    }, {} as Record<string, any>);

    const consolidated = Object.values(grouped).map((group: any) => {
      // Determine primary category (most expensive category in the bill)
      const primaryCategory = Object.entries(group.categoryBreakdown)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'materials';

      return {
        billNumber: group.orderNumber,
        vendorName: group.jobName.includes('MENCH') ? 'Menards' : 
                    group.jobName.includes('CARCANA') ? 'Carcana' : 
                    group.jobName.split(' ')[0],
        billDate: group.orderPlacedDate,
        dueDate: group.orderPlacedDate,
        amount: (group.totalAmount - group.taxAmount).toFixed(2),
        taxAmount: group.taxAmount.toFixed(2),
        totalAmount: group.totalAmount.toFixed(2),
        category: primaryCategory,
        categoryBreakdown: group.categoryBreakdown,
        status: group.orderStatus.toLowerCase() === 'invoiced' ? 'pending' : 
                group.orderStatus.toLowerCase() === 'pending' ? 'pending' : 'approved',
        lineItems: group.lineItems,
        notes: `Imported from Beacon CSV. PO: ${group.vendorPO}. Address: ${group.shippingAddress}`,
      };
    });

    setConsolidatedBills(consolidated);
    await detectPriceSpikes(consolidated);
  };

  const detectPriceSpikes = async (bills: any[]) => {
    // Get historical bills for price comparison
    const allBills = await utils.bills.getAll.fetch();
    
    const alerts: any[] = [];
    
    bills.forEach(newBill => {
      newBill.lineItems.forEach((item: any) => {
        // Find historical prices for similar items
        const historicalPrices: number[] = [];
        
        allBills?.forEach((existingBillData: any) => {
          const existingBill = existingBillData.bill;
          if (existingBill.lineItems) {
            try {
              const lineItems = typeof existingBill.lineItems === 'string' 
                ? JSON.parse(existingBill.lineItems) 
                : existingBill.lineItems;
              
              lineItems.forEach((existingItem: any) => {
                // Match by similar description (fuzzy match)
                const similarity = calculateSimilarity(
                  item.description.toLowerCase(), 
                  existingItem.description?.toLowerCase() || ''
                );
                
                if (similarity > 0.6 && existingItem.unitPrice) {
                  historicalPrices.push(parseFloat(existingItem.unitPrice));
                }
              });
            } catch (e) {
              // Skip invalid line items
            }
          }
        });
        
        if (historicalPrices.length >= 3) {
          const avgPrice = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
          const recentPrice = historicalPrices[historicalPrices.length - 1];
          const currentPrice = item.unitPrice;
          
          // Alert if price is 5% higher than average OR 5% higher than most recent
          const avgIncrease = ((currentPrice - avgPrice) / avgPrice) * 100;
          const recentIncrease = ((currentPrice - recentPrice) / recentPrice) * 100;
          
          if (avgIncrease > 5 || recentIncrease > 5) {
            alerts.push({
              billNumber: newBill.billNumber,
              item: item.description,
              currentPrice: currentPrice,
              avgPrice: avgPrice.toFixed(2),
              recentPrice: recentPrice.toFixed(2),
              increase: Math.max(avgIncrease, recentIncrease).toFixed(1),
              type: avgIncrease > recentIncrease ? 'avg' : 'recent',
            });
          }
        }
      });
    });
    
    if (alerts.length > 0) {
      setPriceAlerts(alerts);
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple word-based similarity
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  const [priceAlerts, setPriceAlerts] = useState<any[]>([]);

  const handleMatchWithTransactions = async () => {
    setIsProcessing(true);
    setStep('matching');

    try {
      const result = await matchBillsWithTransactions.mutateAsync({
        bills: consolidatedBills,
      });

      setMatchedBills(result.matched || []);
      
      if (result.matchedCount > 0) {
        toast.success(`Matched ${result.matchedCount} bills with existing bank transactions`);
      } else {
        toast.info('No matching bank transactions found. Bills will be imported as unpaid.');
      }
      
      setIsProcessing(false);
      setStep('preview'); // Go back to preview to show results
    } catch (error: any) {
      toast.error(error.message || 'Failed to match bills');
      setIsProcessing(false);
      setStep('preview'); // Go back to preview on error
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-purple-500 bg-purple-500/20 scale-105' 
                    : 'border-white/20 hover:border-purple-500/50 hover:bg-purple-500/5'
                }`}
              >
                <Upload className={`mx-auto mb-4 transition-all ${isDragging ? 'text-purple-300 scale-110' : 'text-purple-400'}`} size={48} />
                <p className="text-white font-medium mb-2">
                  {isDragging ? '📂 Drop CSV file here' : 'Click or drag & drop CSV file'}
                </p>
                <p className="text-sm text-zinc-400">
                  {isDragging ? 'Release to upload' : 'Beacon bill export format supported'}
                </p>
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

              {/* Price Spike Alerts */}
              {priceAlerts.length > 0 && (
                <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-xl p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-rose-400 flex-shrink-0 mt-1" size={24} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-rose-400 text-lg">⚠️ Price Spike Alert</span>
                        <span className="px-2 py-1 bg-rose-500/20 rounded-full text-xs font-bold text-rose-300">
                          {priceAlerts.length} {priceAlerts.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <p className="text-sm text-rose-300 mb-3">
                        The following materials have abnormally high prices compared to your historical purchases:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {priceAlerts.map((alert, idx) => (
                          <div key={idx} className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm mb-1">{alert.item}</p>
                                <p className="text-xs text-rose-300">Bill #{alert.billNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-rose-400">
                                  +{alert.increase}%
                                </p>
                                <p className="text-xs text-rose-300">
                                  ${alert.currentPrice} vs ${alert.type === 'avg' ? alert.avgPrice : alert.recentPrice} {alert.type === 'avg' ? 'avg' : 'recent'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-rose-500/20">
                        <p className="text-xs text-rose-300">
                          💡 <strong>Recommendation:</strong> Review these items before importing. Consider contacting vendors about pricing or checking for data entry errors.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <AlertCircle size={18} />
                  <span className="font-medium text-sm">Smart Category Mapping & AI Matching</span>
                </div>
                <p className="text-xs text-cyan-300 ml-6 mb-2">
                  ✓ Materials automatically categorized by type (Shingles→Roofing Materials, Nails→Fasteners, etc.)
                </p>
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
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {consolidatedBills.map((bill, idx) => {
                        const hasAlert = priceAlerts.some(a => a.billNumber === bill.billNumber);
                        return (
                          <tr key={idx} className={`text-white hover:bg-white/5 ${hasAlert ? 'bg-rose-500/5' : ''}`}>
                            <td className="px-4 py-3 font-mono text-xs">
                              {hasAlert && <span className="text-rose-400 mr-1">⚠️</span>}
                              {bill.billNumber}
                            </td>
                            <td className="px-4 py-3">{bill.vendorName}</td>
                            <td className="px-4 py-3 text-zinc-400">{bill.billDate}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs bg-purple-500/10 text-purple-400 capitalize">
                                {bill.category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-400">{bill.lineItems.length} items</td>
                            <td className="px-4 py-3 font-mono">${parseFloat(bill.totalAmount).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
