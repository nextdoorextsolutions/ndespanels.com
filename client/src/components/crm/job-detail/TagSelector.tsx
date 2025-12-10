/**
 * TagSelector Component
 * Allows users to select multiple tags when creating a message
 */

import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ActivityTag, TAG_CONFIG } from "@/types/activity";

interface TagSelectorProps {
  selectedTags: ActivityTag[];
  onChange: (tags: ActivityTag[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const toggleTag = (tag: ActivityTag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
        >
          <Tag className="w-4 h-4 mr-2" />
          Add Tags
          {selectedTags.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#00d4aa] text-slate-900 rounded-full text-xs font-medium">
              {selectedTags.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-slate-800 border-slate-700 p-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white mb-3">Select Topic Tags</p>
          {(Object.keys(TAG_CONFIG) as ActivityTag[]).map((tag) => {
            const config = TAG_CONFIG[tag];
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isSelected 
                    ? config.color + " border-current"
                    : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-lg">{config.emoji}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium">{config.label}</div>
                    <div className="text-xs opacity-75">{config.description}</div>
                  </div>
                </span>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
