import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  MapPin, 
  Clock, 
  Filter,
  Columns,
  List,
  Loader2
} from 'lucide-react';
import { Sidebar } from '@/components/finance/Sidebar';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

// Match the 10-stage pipeline from main CRM
type JobStage = 'lead' | 'appointment_set' | 'prospect' | 'approved' | 'project_scheduled' | 'completed' | 'invoiced' | 'lien_legal' | 'closed_deal' | 'closed_lost';

const STAGES: { value: JobStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'approved', label: 'Approved' },
  { value: 'project_scheduled', label: 'Project Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'lien_legal', label: 'Lien Legal' },
  { value: 'closed_deal', label: 'Closed Deal' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const Jobs: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch real jobs data from main database
  const { data: jobs, isLoading } = trpc.crm.getLeads.useQuery({});

  const getTagColor = (dealType: string) => {
    switch (dealType) {
      case 'insurance': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cash': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'financed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getDaysStyle = (days: number) => {
    if (days > 10) return 'text-rose-400';
    if (days > 5) return 'text-amber-400';
    return 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0B0C10] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/50 bg-[#0B0C10]/80 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Board</h1>
            <p className="text-gray-400 text-sm">Track projects from lead to completion.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
              <button className="p-2 bg-gray-700 rounded text-white shadow-sm">
                <Columns className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search jobs..." 
                className="bg-gray-900 border border-gray-700 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-cyan-500 w-56 transition-colors placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg border border-transparent hover:border-gray-700 transition-all">
              <Filter className="w-4 h-4" />
            </button>

            <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Plus className="w-4 h-4" />
              New Job
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full flex p-6 gap-6 min-w-max">
            
            {STAGES.map((stage) => {
              const jobsInStage = (jobs || []).filter(j => j.status === stage.value);
              
              return (
                <div key={stage.value} className="flex flex-col w-80 h-full">
                  <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-200 text-sm">{stage.label}</h3>
                      <span className="bg-gray-900 text-gray-400 text-xs px-2 py-0.5 rounded-full border border-gray-700">
                        {jobsInStage.length}
                      </span>
                    </div>
                    <button className="text-gray-500 hover:text-gray-300">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 bg-gray-900/30 rounded-xl p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent border border-dashed border-gray-800/50">
                    {jobsInStage.map((job) => {
                      const daysInStage = Math.floor((new Date().getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Link key={job.id} href={`/crm/job/${job.id}`}>
                          <div 
                            className="bg-[#151a21] p-4 rounded-lg border border-gray-800 shadow-sm mb-3 cursor-pointer hover:shadow-lg hover:border-cyan-500/30 hover:-translate-y-1 transition-all group relative"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getTagColor(job.dealType || 'cash')}`}>
                                {job.dealType?.toUpperCase() || 'CASH'}
                              </span>
                              <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>

                            <h4 className="font-semibold text-white text-sm mb-1">{job.fullName}</h4>
                            <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              <span className="truncate">{job.address}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-800/80">
                              <div className={`flex items-center gap-1.5 text-xs font-medium ${getDaysStyle(daysInStage)}`} title="Days in current stage">
                                <Clock className="w-3 h-3" />
                                {daysInStage}d
                              </div>

                              <div className="text-gray-200 text-sm font-semibold tracking-wide">
                                ${((job.amountPaid || 0) / 100).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {jobsInStage.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-xs">
                        No jobs
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Jobs;
