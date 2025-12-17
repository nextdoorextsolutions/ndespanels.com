/**
 * JobDetailTabs Component
 * Tab navigation bar and search functionality for job detail page
 */

import { Search } from "lucide-react";

interface Tab {
  id: string;
  label: string;
}

interface JobDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "production_report", label: "Production Report" },
  { id: "documents", label: "Documents" },
  { id: "photos", label: "Photos" },
  { id: "messages", label: "Messages" },
  { id: "timeline", label: "Timeline" },
  { id: "proposal", label: "Proposal" },
  { id: "estimator", label: "Estimator" },
  { id: "edit_history", label: "Edit History" },
];

export function JobDetailTabs({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
}: JobDetailTabsProps) {
  return (
    <>
      {/* Tabs */}
      <div className="px-6 pb-0">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#00d4aa] text-black"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      {activeTab !== "overview" && activeTab !== "proposal" && (
        <div className="px-6 pb-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
