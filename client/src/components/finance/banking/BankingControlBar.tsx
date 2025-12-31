/**
 * BankingControlBar Component
 * Action bar containing Upload, AI Categorize, Bulk Delete, and Quick Add buttons
 */

import React from 'react';
import { Upload, Trash2, BookOpen, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AI_BATCH_SIZE, MONTHS } from '@/constants/banking-constants';

interface BankingControlBarProps {
  // Search & Filter
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  categories: string[];
  
  // Upload
  isUploading: boolean;
  isDragging: boolean;
  onUploadClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Actions
  onAICategorize: () => void;
  isAICategorizing: boolean;
  onBulkDelete: () => void;
  onQuickAdd: () => void;
  
  // Conditional display
  showBulkDelete: boolean;
  selectedMonth: string;
  selectedYear: string;
}

export function BankingControlBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  isUploading,
  isDragging,
  onUploadClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onAICategorize,
  isAICategorizing,
  onBulkDelete,
  onQuickAdd,
  showBulkDelete,
  selectedMonth,
  selectedYear,
}: BankingControlBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
          type="text" 
          placeholder="Search transactions..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 text-white w-64" 
        />
      </div>

      {/* Category Filter */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-cyan-500 text-white"
      >
        <option value="all">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Hidden File Input */}
      <input
        id="bank-statement-upload"
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Upload Button with Drag & Drop */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative transition-all ${isDragging ? 'scale-105' : ''}`}
      >
        <Button 
          onClick={onUploadClick}
          disabled={isUploading}
          className={`bg-purple-600 hover:bg-purple-700 transition-all ${
            isDragging ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : ''
          }`}
        >
          <Upload size={16} className="mr-2" />
          {isUploading ? 'Uploading...' : isDragging ? 'Drop File Here' : 'Upload Statement'}
        </Button>
        {isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-purple-400 rounded-lg pointer-events-none" />
        )}
      </div>

      {/* Bulk Delete Button */}
      {showBulkDelete && (
        <Button
          onClick={onBulkDelete}
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-600/10"
        >
          <Trash2 size={16} className="mr-2" />
          Delete {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
        </Button>
      )}

      {/* Quick Add Button */}
      <Button
        onClick={onQuickAdd}
        variant="outline"
        className="border-cyan-600 text-cyan-400 hover:bg-cyan-600/10"
      >
        <BookOpen size={16} className="mr-2" />
        Quick Add
      </Button>

      {/* AI Categorize Button */}
      <Button
        onClick={onAICategorize}
        disabled={isAICategorizing}
        variant="outline"
        className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
      >
        <Sparkles size={16} className="mr-2" />
        {isAICategorizing ? 'Categorizing...' : `AI Categorize (${AI_BATCH_SIZE})`}
      </Button>
    </div>
  );
}
