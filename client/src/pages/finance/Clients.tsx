import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Phone, 
  Calendar, 
  ChevronRight, 
  Filter, 
  List as ListIcon, 
  Map as MapIcon,
  Navigation,
  Mail,
  MoreVertical
} from 'lucide-react';
import { Sidebar } from '@/components/finance/Sidebar';

type ClientStatus = 'Lead' | 'Customer' | 'Active Lead' | 'Past Customer' | 'Warranty' | 'Estimate';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const Clients: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // TODO: Replace with actual Supabase query
  // const { data: clients, isLoading } = useQuery(['clients'], fetchClients);
  const clients: Client[] = [
    {
      id: '1',
      name: 'Michael Anderson',
      email: 'michael.anderson@email.com',
      phone: '(555) 123-4567',
      address: '124 Maple Ave, Springfield, IL 62701',
      latitude: 39.7817,
      longitude: -89.6501,
      status: 'Customer',
      notes: 'Full roof replacement completed Oct 2023.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Sarah Jenkins',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      address: '882 Oak Lane, Springfield, IL 62702',
      latitude: 39.7990,
      longitude: -89.6440,
      status: 'Customer',
      notes: 'Gutter repair completed Nov 2023.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Robert Vance',
      email: 'rvance@email.com',
      phone: '(555) 456-7890',
      address: '402 Pine St, Springfield, IL 62704',
      latitude: 39.7700,
      longitude: -89.6600,
      status: 'Lead',
      notes: 'Requested estimate for shingle repair.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Helper: Mock coordinates for map positioning (will be replaced with real Google Map)
  const getMapCoordinates = (lat: number | null, lon: number | null) => {
    // Use random positioning for mock map visualization
    return { 
      x: Math.random() * 100, 
      y: Math.random() * 100 
    };
  };

  // Helper: Get time since last contact
  const getLastContact = (date: Date) => {
    const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active Lead':
      case 'Lead': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Past Customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Warranty': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Estimate': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex flex-col h-screen bg-[#0f111a] text-white font-sans overflow-hidden flex-1">
        
        {/* Top Header */}
        <div className="flex-none p-6 border-b border-gray-800 bg-[#0f111a] z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Client Territory</h1>
              <p className="text-gray-400 text-sm">Manage relationships and view job locations.</p>
            </div>
            
            {/* Mobile View Toggle */}
            <div className="flex md:hidden bg-[#1e293b] p-1 rounded-lg border border-gray-700">
              <button 
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-cyan-500 text-black' : 'text-gray-400'}`}
              >
                <ListIcon className="w-4 h-4" /> List
              </button>
              <button 
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'map' ? 'bg-cyan-500 text-black' : 'text-gray-400'}`}
              >
                <MapIcon className="w-4 h-4" /> Map
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3">
               <div className="text-sm text-gray-400 bg-[#1e293b] px-3 py-1.5 rounded-lg border border-gray-800">
                  <span className="text-cyan-400 font-bold">{clients.length}</span> Total Clients
               </div>
               <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 px-4 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                  Add Client
               </button>
            </div>
          </div>
        </div>

        {/* Main Content Area (Split View) */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* LEFT: Client List (Rolodex) */}
          <div className={`
            flex-col w-full md:w-[40%] lg:w-[35%] border-r border-gray-800 bg-[#0f111a] flex
            ${activeTab === 'list' ? 'flex' : 'hidden md:flex'}
          `}>
            
            {/* List Search Header */}
            <div className="p-4 border-b border-gray-800 flex gap-2">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                 <input 
                   type="text" 
                   placeholder="Search name, address, phone..." 
                   className="w-full bg-[#1e293b] border border-gray-700 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors placeholder-gray-600"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
              <button className="p-2.5 bg-[#1e293b] border border-gray-700 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
              {filteredClients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  className={`
                    bg-[#1e293b] p-4 rounded-xl border transition-all cursor-pointer group relative
                    ${selectedClient === client.id 
                      ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'border-gray-800 hover:border-gray-600 hover:bg-[#232d3f]'}
                  `}
                >
                  {/* Card Top: Name & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{client.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(client.status)}`}>
                              {client.status}
                          </span>
                      </div>
                    </div>
                    <button className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Middle: Details */}
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-500" />
                      <span className="flex-1 leading-snug">{client.address}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>Contacted: <span className="text-gray-300">{getLastContact(client.createdAt)}</span></span>
                    </div>
                    
                    <div className="flex items-center text-cyan-500 font-medium opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      View Profile <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Map View */}
          <div className={`
            flex-1 bg-[#161b22] relative overflow-hidden
            ${activeTab === 'map' ? 'block' : 'hidden md:block'}
          `}>
              {/* Map Placeholder Content */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="w-full h-full" style={{ 
                      backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                      backgroundSize: '40px 40px' 
                  }}></div>
              </div>

              {/* Map Controls (Floating) */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                  <button className="bg-[#1e293b] p-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 shadow-lg">
                      <Navigation className="w-5 h-5" />
                  </button>
                  <button className="bg-[#1e293b] p-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 shadow-lg font-bold">
                      +
                  </button>
                  <button className="bg-[#1e293b] p-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 shadow-lg font-bold">
                      -
                  </button>
              </div>

              {/* Mock Pins */}
              {filteredClients.map((client) => {
                const coords = getMapCoordinates(client.latitude, client.longitude);
                return (
                  <div 
                      key={client.id}
                      className="absolute group cursor-pointer z-10"
                      style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                      onClick={() => setSelectedClient(client.id)}
                  >
                      {/* The Visual Pin */}
                      <div className={`
                          relative flex items-center justify-center w-6 h-6 rounded-full 
                          ${selectedClient === client.id ? 'bg-white z-20 scale-125' : 'bg-cyan-900/40 hover:bg-cyan-500'}
                          border-2 ${selectedClient === client.id ? 'border-cyan-500' : 'border-cyan-500'} 
                          transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.6)]
                      `}>
                          <div className={`w-2 h-2 rounded-full ${selectedClient === client.id ? 'bg-cyan-500' : 'bg-white'}`}></div>
                          
                          {/* Radar Pulse Animation */}
                          <div className="absolute inset-0 rounded-full border border-cyan-500 animate-ping opacity-75"></div>
                      </div>

                      {/* Tooltip (Hover) */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                          <div className="bg-[#1e293b] border border-gray-700 rounded-lg shadow-xl p-3 text-left relative">
                              {/* Arrow */}
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e293b] border-b border-r border-gray-700 rotate-45"></div>
                              
                              {/* Content */}
                              <h4 className="font-bold text-white text-sm truncate">{client.name}</h4>
                              <div className="text-xs text-gray-400 mt-1">
                                  <span className={`${getStatusColor(client.status)} px-1.5 py-0.5 rounded text-[10px]`}>{client.status}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1 truncate">{client.address}</div>
                          </div>
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

export default Clients;
