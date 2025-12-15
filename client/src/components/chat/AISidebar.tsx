import React from 'react';
import { X, Sparkles, Wand2, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AISidebarProps {
  onGenerateDraft: (type: 'grammar' | 'professional' | 'summarize') => Promise<void>;
  isGenerating: boolean;
}

export function AISidebar({ onGenerateDraft, isGenerating }: AISidebarProps) {
  return (
    <div className="bg-slate-950/50 border-l border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Zerox AI</h3>
            <p className="text-xs text-slate-500">Your CRM Assistant</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <button
              onClick={() => onGenerateDraft('grammar')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-[#00d4aa]/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center group-hover:bg-[#00d4aa]/20">
                <Wand2 className="w-4 h-4 text-slate-400 group-hover:text-[#00d4aa]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">Fix Grammar</p>
                <p className="text-xs text-slate-500">Correct spelling & grammar</p>
              </div>
            </button>

            <button
              onClick={() => onGenerateDraft('professional')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-[#00d4aa]/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center group-hover:bg-[#00d4aa]/20">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#00d4aa]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">Make Professional</p>
                <p className="text-xs text-slate-500">Rewrite in business tone</p>
              </div>
            </button>

            <button
              onClick={() => onGenerateDraft('summarize')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-[#00d4aa]/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center group-hover:bg-[#00d4aa]/20">
                <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-[#00d4aa]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">Summarize</p>
                <p className="text-xs text-slate-500">Create concise summary</p>
              </div>
            </button>
          </div>
        </div>

        {/* AI Capabilities */}
        <div className="pt-4 border-t border-slate-800/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            What I Can Do
          </h4>
          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00d4aa] mt-1.5 flex-shrink-0"></div>
              <p>Answer questions about jobs, customers, and invoices</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00d4aa] mt-1.5 flex-shrink-0"></div>
              <p>Draft professional replies and messages</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00d4aa] mt-1.5 flex-shrink-0"></div>
              <p>Summarize conversations and activities</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#00d4aa] mt-1.5 flex-shrink-0"></div>
              <p>Help with technical CRM questions</p>
            </div>
          </div>
        </div>

        {/* Usage Tip */}
        <div className="pt-4 border-t border-slate-800/50">
          <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#00d4aa] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-white mb-1">Pro Tip</p>
                <p className="text-xs text-slate-400">
                  Type <span className="text-[#00d4aa] font-mono">@gemini</span> or{' '}
                  <span className="text-[#00d4aa] font-mono">@zerox</span> in any message to
                  ask me questions directly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Interactions */}
        <div className="pt-4 border-t border-slate-800/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Recent Interactions
          </h4>
          <div className="space-y-2">
            <div className="p-2 rounded-md bg-slate-800/30 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">2 hours ago</p>
              <p className="text-xs text-slate-300">Helped draft customer email</p>
            </div>
            <div className="p-2 rounded-md bg-slate-800/30 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Yesterday</p>
              <p className="text-xs text-slate-300">Summarized Q3 dashboard review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Powered by Google Gemini
          </p>
        </div>
      </div>
    </div>
  );
}
