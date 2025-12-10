/**
 * ProductSelector Component
 * Visual dropdown for selecting shingles from the products catalog
 */

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { BRAND_LOGO_URL } from "@/lib/constants";

interface ProductSelectorProps {
  selectedProductId: number | null;
  onChange: (id: number) => void;
}

export function ProductSelector({ selectedProductId, onChange }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Fetch shingles from backend
  const { data: shingles, isLoading } = trpc.products.getShingles.useQuery();
  
  // Find selected product
  const selectedProduct = shingles?.find(s => s.id === selectedProductId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white">Select Shingle</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-auto py-3"
          >
            {selectedProduct ? (
              <div className="flex items-center gap-3">
                {selectedProduct.imageUrl && (
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.color || ''} 
                    className="h-10 w-10 rounded object-cover border border-slate-600"
                    onError={(e) => {
                      e.currentTarget.src = BRAND_LOGO_URL;
                      e.currentTarget.onerror = null;
                    }}
                  />
                )}
                <div className="text-left">
                  <div className="font-medium">{selectedProduct.productName} - {selectedProduct.color}</div>
                  <div className="text-xs text-slate-400">{selectedProduct.manufacturer}</div>
                </div>
              </div>
            ) : (
              <span className="text-slate-400">Select a shingle...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[500px] p-0 bg-slate-800 border-slate-700" align="start">
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400">Loading shingles...</div>
            ) : shingles && shingles.length > 0 ? (
              <div className="p-2">
                {shingles.map((shingle) => (
                  <button
                    key={shingle.id}
                    onClick={() => {
                      onChange(shingle.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      selectedProductId === shingle.id
                        ? 'bg-[#00d4aa]/20 border border-[#00d4aa]'
                        : 'hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    {/* Product Image */}
                    {shingle.imageUrl && (
                      <img 
                        src={shingle.imageUrl} 
                        alt={shingle.color || ''} 
                        className="h-10 w-10 rounded object-cover border border-slate-600 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = BRAND_LOGO_URL;
                          e.currentTarget.onerror = null;
                        }}
                      />
                    )}
                    
                    {/* Product Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            {shingle.productName} - {shingle.color}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {shingle.manufacturer}
                          </div>
                        </div>
                        {selectedProductId === shingle.id && (
                          <Check className="h-4 w-4 text-[#00d4aa] flex-shrink-0" />
                        )}
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {shingle.windRating && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                            💨 {shingle.windRating}
                          </span>
                        )}
                        {shingle.warrantyInfo && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                            🛡️ {shingle.warrantyInfo}
                          </span>
                        )}
                      </div>
                      
                      {/* Description */}
                      {shingle.description && (
                        <p className="text-xs text-slate-500 mt-1">{shingle.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400">No shingles available</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Selected Product Details */}
      {selectedProduct && (
        <div className="mt-3 p-3 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="text-sm text-slate-300">
            <div className="flex gap-2 flex-wrap">
              {selectedProduct.windRating && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">
                  💨 Wind Rating: {selectedProduct.windRating}
                </span>
              )}
              {selectedProduct.warrantyInfo && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                  🛡️ {selectedProduct.warrantyInfo}
                </span>
              )}
            </div>
            {selectedProduct.description && (
              <p className="text-xs text-slate-400 mt-2">{selectedProduct.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
