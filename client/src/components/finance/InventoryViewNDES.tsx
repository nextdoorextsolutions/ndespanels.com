import React, { useState } from 'react';
import { Search, Plus, Package, AlertTriangle, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function InventoryViewNDES() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: items = [], isLoading } = trpc.inventory.getAll.useQuery();
  const { data: stats } = trpc.inventory.getStats.useQuery();
  const { data: categories = [] } = trpc.inventory.getCategories.useQuery();
  const utils = trpc.useUtils();

  const deleteItem = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success('Item deleted');
      utils.inventory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items.filter(item => (item.quantity || 0) <= (item.reorderLevel || 0));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Package size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Items</p>
              <p className="text-2xl font-bold text-white">{stats?.totalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <span className="text-lg font-bold">$</span>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Value</p>
              <p className="text-2xl font-bold text-white">${(stats?.totalValue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Low Stock</p>
              <p className="text-2xl font-bold text-white">{stats?.lowStockCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Out of Stock</p>
              <p className="text-2xl font-bold text-white">{stats?.outOfStockCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={24} />
            <div>
              <p className="font-bold text-amber-400">Low Stock Alert</p>
              <p className="text-sm text-amber-400/70">{lowStockItems.length} items need restocking</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items or SKU..."
            className="w-full bg-[#1a1a20] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 rounded-2xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus size={18} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#1a1a20]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase tracking-widest font-bold bg-white/[0.01]">
              <th className="px-8 py-6">Item</th>
              <th className="px-8 py-6">Category</th>
              <th className="px-8 py-6 text-right">Quantity</th>
              <th className="px-8 py-6 text-right">Unit Cost</th>
              <th className="px-8 py-6 text-right">Total Value</th>
              <th className="px-8 py-6">Status</th>
              <th className="px-8 py-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.length > 0 ? filteredItems.map((item) => {
              const isLowStock = (item.quantity || 0) <= (item.reorderLevel || 0);
              const isOutOfStock = (item.quantity || 0) === 0;
              const totalValue = (item.quantity || 0) * Number(item.unitCost || 0);

              return (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div>
                      <div className="font-bold text-white">{item.itemName}</div>
                      <div className="text-zinc-500 text-xs">{item.sku || 'No SKU'}</div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="font-mono font-bold text-white">{item.quantity || 0}</span>
                    <span className="text-zinc-500 text-xs ml-1">{item.unitOfMeasure}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-mono text-white">
                    ${Number(item.unitCost || 0).toFixed(2)}
                  </td>
                  <td className="px-8 py-6 text-right font-mono font-bold text-white">
                    ${totalValue.toFixed(2)}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isOutOfStock ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      isLowStock ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        className="p-2 text-zinc-500 hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Delete this item?')) {
                            deleteItem.mutate({ id: item.id });
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="px-8 py-20 text-center text-zinc-500 font-medium">
                  No inventory items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
