import React, { useState } from 'react';
import { Hash, MessageSquare, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePresence, PresenceUser } from '@/hooks/usePresence';
import { useAuth } from '@/_core/hooks/useAuth';

interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  unreadCount?: number;
  description?: string;
}

interface ChannelCategory {
  name: string;
  channels: Channel[];
}

interface ChannelSidebarProps {
  activeChannelId: string;
  onChannelSelect: (channelId: string) => void;
  currentUserId: string;
}

// Mission Control Channels
const MISSION_CONTROL: Channel[] = [
  { id: 'general-announcements', name: 'general-announcements', type: 'channel', description: 'Company-wide news, safety bulletins' },
  { id: 'wins-and-shoutouts', name: 'wins-and-shoutouts', type: 'channel', description: 'Sales wins, 5-star reviews, employee recognition' },
  { id: 'safety-alerts', name: 'safety-alerts', type: 'channel', description: 'Weather warnings, job site hazards, OSHA updates' },
  { id: 'fleet-logistics', name: 'fleet-logistics', type: 'channel', description: 'Truck assignments, maintenance, equipment tracking' },
];

// Job Lifecycle Channels
const JOB_LIFECYCLE: Channel[] = [
  { id: 'leads-incoming', name: 'leads-incoming', type: 'channel', unreadCount: 3, description: 'New leads from website/ads' },
  { id: 'estimates-and-bids', name: 'estimates-and-bids', type: 'channel', description: 'Pricing, material costs, margin approvals' },
  { id: 'active-installs', name: 'active-installs', type: 'channel', unreadCount: 5, description: 'Live updates from the field' },
  { id: 'permitting-and-hoa', name: 'permitting-and-hoa', type: 'channel', description: 'City permits and HOA approvals' },
  { id: 'service-and-repair', name: 'service-and-repair', type: 'channel', unreadCount: 2, description: 'Warranty calls, leaks, post-install fixes' },
];

// Field vs Office Channels
const FIELD_OFFICE: Channel[] = [
  { id: 'tech-support', name: 'tech-support', type: 'channel', description: 'CRM or iPad issues for field reps' },
  { id: 'material-orders', name: 'material-orders', type: 'channel', unreadCount: 1, description: 'Shingles, panels, inverters requests' },
  { id: 'design-engineering', name: 'design-engineering', type: 'channel', description: 'Solar array layouts, structural questions' },
];

const DIRECT_MESSAGES: Channel[] = [
  { id: 'dm-sarah', name: 'Sarah Design', type: 'dm', unreadCount: 2 },
  { id: 'dm-mike', name: 'Mike Supervisor', type: 'dm' },
  { id: 'dm-alex', name: 'Alex Developer', type: 'dm' },
];

export function ChannelSidebar({ activeChannelId, onChannelSelect }: ChannelSidebarProps) {
  const { user: authUser } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'mission-control': true,
    'job-lifecycle': true,
    'field-office': true,
  });
  
  // Track presence for the global channel list
  const currentUser: PresenceUser = {
    id: authUser?.id?.toString() || 'guest',
    name: authUser?.name || authUser?.email || 'Guest User',
    avatarUrl: undefined,
    role: authUser?.role || 'user',
  };

  const { onlineUsers } = usePresence({
    threadId: 'global',
    user: currentUser,
    enabled: !!authUser,
  });

  // Helper to check if a user is online
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(u => u.id === userId);
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Render channel category
  const renderCategory = (categoryId: string, title: string, channels: Channel[]) => (
    <div key={categoryId} className="mb-3">
      <button
        onClick={() => toggleCategory(categoryId)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {expandedCategories[categoryId] ? (
          <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
        )}
      </button>
      {expandedCategories[categoryId] && (
        <div className="mt-1 space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-all group ${
                activeChannelId === channel.id
                  ? 'bg-gradient-to-r from-[#00d4aa]/10 to-transparent border-l-2 border-[#00d4aa] text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
              title={channel.description}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate text-xs">{channel.name}</span>
              </div>
              {channel.unreadCount && channel.unreadCount > 0 && (
                <span className="bg-[#00d4aa] text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                  {channel.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-950/50 border-r border-slate-800 flex flex-col h-full">
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">NextDoor Ops</h2>
            <p className="text-xs text-slate-500">8 members online</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Channels Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {renderCategory('mission-control', 'Mission Control', MISSION_CONTROL)}
          {renderCategory('job-lifecycle', 'Job Lifecycle', JOB_LIFECYCLE)}
          {renderCategory('field-office', 'Field vs Office', FIELD_OFFICE)}
        </div>

        {/* Direct Messages Section */}
        <div className="p-3 border-t border-slate-800/50">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Messages</span>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <span className="text-slate-400 text-lg leading-none">+</span>
            </Button>
          </div>
          
          <div className="space-y-0.5">
            {DIRECT_MESSAGES.map((dm) => (
              <button
                key={dm.id}
                onClick={() => onChannelSelect(dm.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-all ${
                  activeChannelId === dm.id
                    ? 'bg-gradient-to-r from-[#00d4aa]/10 to-transparent border-l-2 border-[#00d4aa] text-white font-medium'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={undefined} alt={dm.name} />
                      <AvatarFallback className="bg-slate-700 text-xs text-white">
                        {dm.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(dm.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-950 rounded-full"></div>
                    )}
                  </div>
                  <span className="truncate">{dm.name}</span>
                </div>
                {dm.unreadCount && dm.unreadCount > 0 && (
                  <span className="bg-[#00d4aa] text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {dm.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-800/50 cursor-pointer transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
            <AvatarFallback className="bg-gradient-to-br from-[#00d4aa] to-[#00b894] text-slate-900 font-semibold">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{authUser?.email || 'Online'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
