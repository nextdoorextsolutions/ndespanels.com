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
  const [duplicateBills, setDuplicateBills] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'duplicates' | 'complete'>('upload');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
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
        const bills: ParsedBill[] = results.data.map((row: any) => {
          // Parse numeric values, handling currency formatting
          const parseAmount = (val: any) => {
            if (!val) return 0;
            const str = String(val).replace(/[$,]/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          };

          return {
            orderPlacedDate: row['OrderPlacedDate'] || row['Order Placed Date'] || '',
            orderNumber: row['OrderNumber'] || row['Order Number'] || '',
            orderStatus: row['OrderStatus'] || row['Order Status'] || '',
            vendorPO: row['VendorPO'] || row['Vendor PO'] || '',
            jobName: row['JobName'] || row['Job Name'] || '',
            shippingAddress: row['ShippingAddress'] || row['Shipping Address'] || '',
            memberItemNumber: row['MemberItemNumber'] || row['Member Item Number'] || '',
            itemDescription: row['ItemDescription'] || row['Item Description'] || '',
            unitOfMeasure: row['UnitOfMeasure'] || row['Unit of Measure'] || '',
            unitPrice: parseAmount(row['UnitPrice'] || row['Unit Price']),
            shippedExtendedTotal: parseAmount(row['ShippedExtendedTotal'] || row['Shipped Extended Total']),
            otherCharges: parseAmount(row['OtherCharges'] || row['Other Charges']),
            tax: parseAmount(row['Tax']),
            subTotal: parseAmount(row['SubTotal'] || row['Sub Total']),
            total: parseAmount(row['Total']),
          };
        });

        console.log('[CSV Import] Parsed bills sample:', bills.slice(0, 3));
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
      
      // Only add line items that have actual item descriptions (not summary rows)
      if (bill.itemDescription && bill.itemDescription.trim()) {
        acc[key].lineItems.push({
          description: bill.itemDescription,
          quantity: 1,
          unitPrice: bill.unitPrice,
          amount: bill.shippedExtendedTotal || bill.unitPrice,
          category,
        });
        
        // Track category breakdown using the line item amount
        const lineAmount = bill.shippedExtendedTotal || bill.unitPrice || 0;
        acc[key].categoryBreakdown[category] = (acc[key].categoryBreakdown[category] || 0) + lineAmount;
      }
      
      // Accumulate totals (these might be on summary rows or individual rows)
      if (bill.total && !isNaN(bill.total) && bill.total > 0) {
        acc[key].totalAmount = Math.max(acc[key].totalAmount, bill.total);
      }
      if (bill.tax && !isNaN(bill.tax) && bill.tax > 0) {
        acc[key].taxAmount = Math.max(acc[key].taxAmount, bill.tax);
      }
      if (bill.subTotal && !isNaN(bill.subTotal) && bill.subTotal > 0) {
        acc[key].totalAmount = Math.max(acc[key].totalAmount, bill.subTotal + (bill.tax || 0));
      }
      
      // If no totals found yet, sum up line items as fallback
      if (acc[key].totalAmount === 0 && bill.shippedExtendedTotal > 0) {
        const currentSum = acc[key].lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        acc[key].totalAmount = currentSum;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const consolidated = Object.values(grouped).map((group: any) => {
      // Determine primary category (most expensive category in the bill)
      const primaryCategory = Object.entries(group.categoryBreakdown)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'materials';

      // All orders from Beacon CSV are from Beacon Building Products
      // The JobName/CustomerPO contains the homeowner's last name (shipping destination)
      const vendorName = 'Beacon Building Products';
      const customerName = group.jobName || group.vendorPO || 'Unknown Customer';

      // If still no total, sum all line items
      if (group.totalAmount === 0 && group.lineItems.length > 0) {
        group.totalAmount = group.lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      }

      // Parse and format dates to ISO string
      const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        
        // Handle MM-DD-YYYY format from Beacon CSV
        // Split the date string and parse manually for reliability
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          
          // Create date in local timezone then convert to ISO
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
        
        // Fallback: try native Date parsing
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      };

      console.log(`[CSV Import] Order ${group.orderNumber}: Total=${group.totalAmount}, Tax=${group.taxAmount}, LineItems=${group.lineItems.length}`);

      return {
        billNumber: group.orderNumber,
        vendorName: vendorName,
        billDate: parseDate(group.orderPlacedDate),
        dueDate: parseDate(group.orderPlacedDate),
        amount: (group.totalAmount - group.taxAmount).toFixed(2),
        taxAmount: group.taxAmount.toFixed(2),
        totalAmount: group.totalAmount.toFixed(2),
        category: primaryCategory,
        categoryBreakdown: group.categoryBreakdown,
        status: group.orderStatus.toLowerCase() === 'invoiced' ? 'pending' : 
                group.orderStatus.toLowerCase() === 'pending' ? 'pending' : 'approved',
        lineItems: group.lineItems,
        notes: `Imported from Beacon CSV. Customer: ${customerName}. PO: ${group.vendorPO}. Address: ${group.shippingAddress}`,
      };
    });

    setConsolidatedBills(consolidated);
    await checkForDuplicates(consolidated);
  };

  const checkForDuplicates = async (bills: any[]) => {
    // Get all existing bills
    const existingBills = await utils.bills.getAll.fetch();
    const existingBillNumbers = new Set(existingBills.map(b => b.bill.billNumber));
    
    // Find duplicates
    const duplicates = bills.filter(bill => existingBillNumbers.has(bill.billNumber));
    
    if (duplicates.length > 0) {
      setDuplicateBills(duplicates);
      setStep('duplicates');
      console.log(`[CSV Import] Found ${duplicates.length} duplicate bills`);
    } else {
      setStep('preview');
    }
  };

  const handleContinueWithDuplicates = () => {
    if (skipDuplicates) {
      // Filter out duplicates
      const nonDuplicates = consolidatedBills.filter(
        bill => !duplicateBills.some(dup => dup.billNumber === bill.billNumber)
      );
      setConsolidatedBills(nonDuplicates);
      toast.info(`Skipping ${duplicateBills.length} duplicate bills. Importing ${nonDuplicates.length} new bills.`);
    } else {
      toast.info(`Re-importing all ${consolidatedBills.length} bills (including ${duplicateBills.length} duplicates).`);
    }
    setStep('preview');
  };

  const handleImport = async () => {
    setIsProcessing(true);

    await bulkImport.mutateAsync({
      bills: consolidatedBills.map(bill => ({
        billNumber: bill.billNumber,
        vendorName: bill.vendorName,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        amount: bill.amount,
        taxAmount: bill.taxAmount,
        totalAmount: bill.totalAmount,
        category: bill.category,
        status: bill.status,
        lineItems: bill.lineItems,
        notes: bill.notes,
      })),
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedBills([]);
    setConsolidatedBills([]);
    setDuplicateBills([]);
    setSkipDuplicates(true);
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

          {/* Step 2: Duplicates Warning */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="text-amber-400 flex-shrink-0 mt-1" size={32} />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-amber-400 mb-2">⚠️ Duplicate Bills Detected</h3>
                    <p className="text-zinc-300 mb-4">
                      Found <strong className="text-white">{duplicateBills.length}</strong> bills that already exist in your system.
                    </p>
                    
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                      <p className="text-sm font-medium text-amber-300 mb-2">Duplicate Bills:</p>
                      <div className="space-y-1">
                        {duplicateBills.map((bill, idx) => (
                          <div key={idx} className="text-sm text-zinc-300">
                            • {bill.billNumber} - {bill.vendorName} - ${bill.totalAmount}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="duplicateHandling"
                          checked={skipDuplicates}
                          onChange={() => setSkipDuplicates(true)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <div>
                          <p className="font-medium text-white">Skip Duplicates (Recommended)</p>
                          <p className="text-xs text-zinc-400">
                            Import only {consolidatedBills.length - duplicateBills.length} new bills
                          </p>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="duplicateHandling"
                          checked={!skipDuplicates}
                          onChange={() => setSkipDuplicates(false)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <div>
                          <p className="font-medium text-white">Re-import All Bills</p>
                          <p className="text-xs text-zinc-400">
                            This will create duplicate entries in your system
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinueWithDuplicates}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
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
                  <span className="font-medium text-sm">Smart Category Mapping</span>
                </div>
                <p className="text-xs text-cyan-300 ml-6">
                  ✓ Materials automatically categorized by type (Shingles→Roofing Materials, Nails→Fasteners, etc.)
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
                        return (
                          <tr key={idx} className="text-white hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-xs">
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

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="space-y-4 text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white">Import Complete!</h3>
              <p className="text-zinc-400">
                Successfully imported {consolidatedBills.length} bills
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
