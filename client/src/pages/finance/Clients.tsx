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
  MoreVertical,
  Loader2
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Sidebar } from '@/components/finance/Sidebar';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

// Client stages that should appear in the Clients page
const CLIENT_STAGES = ['approved', 'project_scheduled', 'completed', 'invoiced'];

const Clients: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  // Fetch real jobs data and filter to client stages only
  const { data: allJobs, isLoading } = trpc.crm.getLeads.useQuery({});
  
  // Filter to only show jobs in client stages (Approved, Project Scheduled, Completed, Invoiced)
  const clients = (allJobs || []).filter(job => CLIENT_STAGES.includes(job.status));

  // Dark theme map style for Google Maps
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#94a3b8' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#475569' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#1e3a2f' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#4ade80' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#334155' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1e293b' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#475569' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1e293b' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0f172a' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#334155' }]
    }
  ];

  // Calculate map center from clients with coordinates
  const getMapCenter = () => {
    // Default center - jobs don't have lat/lng yet, will need geocoding in future
    return { lat: 39.8, lng: -89.65 }; // Default to Springfield, IL
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
      client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'project_scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'invoiced': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'project_scheduled': return 'Scheduled';
      case 'completed': return 'Completed';
      case 'invoiced': return 'Invoiced';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#0B0C10] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading clients...</p>
        </div>
      </div>
    );
  }

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
                <Link key={client.id} href={`/crm/job/${client.id}`}>
                  <div 
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
                        <h3 className="font-bold text-white text-base">{client.fullName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusColor(client.status)}`}>
                                {getStatusLabel(client.status)}
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
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom: Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Created: <span className="text-gray-300">{getLastContact(client.createdAt)}</span></span>
                      </div>
                      
                      <div className="flex items-center text-cyan-500 font-medium opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                        View Job <ChevronRight className="w-3 h-3 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* RIGHT: Map View */}
          <div className={`
            flex-1 bg-[#161b22] relative overflow-hidden
            ${activeTab === 'map' ? 'block' : 'hidden md:block'}
          `}>
              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                <Map
                  defaultCenter={getMapCenter()}
                  defaultZoom={12}
                  mapId="dark-map"
                  styles={darkMapStyle}
                  disableDefaultUI={true}
                  gestureHandling="greedy"
                  className="w-full h-full"
                >
                  {/* TODO: Add geocoding to get lat/lng from addresses, then render markers */}
                  {/* Jobs don't have latitude/longitude fields yet - will need geocoding service */}
                </Map>
              </APIProvider>

              {/* Map Controls Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-none">
                  <div className="bg-[#1e293b]/90 backdrop-blur-sm p-2 rounded-lg border border-gray-700 text-gray-300 shadow-lg">
                      <Navigation className="w-5 h-5" />
                  </div>
              </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Clients;
