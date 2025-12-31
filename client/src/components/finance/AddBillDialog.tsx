import React, { useState } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AddBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBillDialog({ open, onOpenChange }: AddBillDialogProps) {
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: '',
    taxAmount: '0',
    category: '',
    notes: '',
  });

  const utils = trpc.useUtils();

  const createBill = trpc.bills.create.useMutation({
    onSuccess: () => {
      toast.success('Bill created successfully');
      utils.bills.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create bill');
    },
  });

  const resetForm = () => {
    setFormData({
      vendorName: '',
      vendorEmail: '',
      vendorPhone: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      amount: '',
      taxAmount: '0',
      category: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendorName || !formData.amount || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    createBill.mutate({
      vendorName: formData.vendorName,
      vendorEmail: formData.vendorEmail || undefined,
      vendorPhone: formData.vendorPhone || undefined,
      billDate: formData.billDate,
      dueDate: formData.dueDate,
      amount: parseFloat(formData.amount),
      taxAmount: parseFloat(formData.taxAmount || '0'),
      category: formData.category || undefined,
      notes: formData.notes || undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a20] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Add New Bill</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="text-zinc-400" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vendor Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Vendor Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Vendor Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="Enter vendor name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Vendor Email</label>
                <input
                  type="email"
                  value={formData.vendorEmail}
                  onChange={(e) => setFormData({ ...formData, vendorEmail: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Vendor Phone</label>
                <input
                  type="tel"
                  value={formData.vendorPhone}
                  onChange={(e) => setFormData({ ...formData, vendorPhone: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Bill Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Bill Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Bill Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Due Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Amount <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tax Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all"
              >
                <option value="">Select category</option>
                <option value="materials">Materials</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="professional_services">Professional Services</option>
                <option value="office">Office Supplies</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          {/* Total Display */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-medium">Total Amount:</span>
              <span className="text-2xl font-bold text-white">
                ${(parseFloat(formData.amount || '0') + parseFloat(formData.taxAmount || '0')).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBill.isPending}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createBill.isPending ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
