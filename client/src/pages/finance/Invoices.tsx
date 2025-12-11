import React, { useState } from 'react';
import { Sidebar } from '@/components/finance/Sidebar';

export default function Invoices() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-gray-800/50 bg-[#0B0C10]/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Invoices</h1>
            <p className="text-gray-400 text-sm">Manage your invoices and billing</p>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {/* Your invoice content goes here */}
        </div>
      </main>
    </div>
  );
}
