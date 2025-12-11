import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MapPin,
  List,
  Map as MapIcon,
  Phone,
  Mail,
  MoreVertical,
  Filter
} from 'lucide-react';
import { Sidebar } from '@/components/finance/Sidebar';

type ClientStatus = 'Lead' | 'Customer' | 'Active' | 'Past Customer';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Mock data - replace with actual API call
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

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || client.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Lead': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Customer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Active': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0C10] text-gray-100 font-sans selection:bg-cyan-500/30">
      
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/50 bg-[#0B0C10]/80 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-gray-400 text-sm">Manage your client database and territory map</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
              <button 
                onClick={() => setViewMode('map')}
                className={`p-2 rounded transition-colors ${viewMode === 'map' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search clients..." 
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
              New Client
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          {viewMode === 'map' ? (
            <div className="h-full bg-[#151a21] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white mb-2">Territory Map</h3>
                  <p className="text-sm">Map integration coming soon</p>
                  <p className="text-xs mt-2">Will display {filteredClients.filter(c => c.latitude && c.longitude).length} clients with coordinates</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="flex gap-2 mb-6">
                {['All', 'Lead', 'Customer', 'Active'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedStatus === status
                        ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-[#151a21] p-6 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg mb-1">{client.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </div>
                      <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-gray-400">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    </div>

                    {client.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-xs text-gray-500 line-clamp-2">{client.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-gray-800/50 p-4 rounded-full mb-4">
                    <MapPin className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">No clients found</h3>
                  <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Clients;
