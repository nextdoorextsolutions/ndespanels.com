import React, { useState } from 'react';
import { Hash, MessageSquare, Users, ChevronDown, ChevronRight, Plus, Settings, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { usePresence, PresenceUser } from '@/hooks/usePresence';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  channels: Array<{
    id: number;
    name: string;
    type: string;
    description: string | null;
    unreadCount?: number;
    members?: Array<{
      userId: number;
      userName: string | null;
      userEmail: string | null;
      userImage: string | null;
    }>;
  }>;
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

export function ChannelSidebar({ activeChannelId, onChannelSelect, channels }: ChannelSidebarProps) {
  const { user: authUser } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'mission-control': true,
    'job-lifecycle': true,
    'field-office': true,
    'direct-messages': true,
    'team': true,
  });
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<typeof channels[0] | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const isOwner = authUser?.role === 'owner';

  // Fetch team members
  const { data: teamMembers } = trpc.messaging.getTeamMembers.useQuery();

  // Get utils for refetching
  const utils = trpc.useUtils();

  // Channel management mutations
  const createChannelMutation = trpc.messaging.createChannel.useMutation({
    onSuccess: () => {
      toast.success('Channel created successfully');
      utils.messaging.getChannels.invalidate();
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setSelectedRoles([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create channel');
    },
  });

  const deleteChannelMutation = trpc.messaging.deleteChannel.useMutation({
    onSuccess: () => {
      toast.success('Channel deleted successfully');
      utils.messaging.getChannels.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete channel');
    },
  });

  const addMemberMutation = trpc.messaging.addChannelMember.useMutation({
    onSuccess: () => {
      toast.success('Member added successfully');
      utils.messaging.getChannels.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add member');
    },
  });

  const removeMemberMutation = trpc.messaging.removeChannelMember.useMutation({
    onSuccess: () => {
      toast.success('Member removed successfully');
      utils.messaging.getChannels.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  // Mutation to get or create DM channel
  const getOrCreateDMMutation = trpc.messaging.getOrCreateDM.useMutation({
    onSuccess: async (data) => {
      // Refetch channels to include the new DM
      await utils.messaging.getChannels.invalidate();
      
      // Switch to the DM channel
      onChannelSelect(data.channelId.toString());
    },
    onError: (error) => {
      console.error('Failed to create DM:', error);
    },
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
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Helper function to get DM partner (the other user in a DM channel)
  const getDMPartner = (channel: typeof channels[0]) => {
    if (!channel.members || channel.members.length === 0) {
      return null;
    }
    
    // Find the member that is NOT the current user
    const partner = channel.members.find(m => m.userId !== authUser?.id);
    return partner || null;
  };

  // Group real channels by category based on name patterns and type
  const dmChannels = channels.filter(c => c.type === 'dm');
  
  const missionControlChannels = channels.filter(c => 
    c.type !== 'dm' && ['general-announcements', 'wins-and-shoutouts', 'safety-alerts', 'fleet-logistics'].includes(c.name)
  );
  
  const jobLifecycleChannels = channels.filter(c => 
    c.type !== 'dm' && ['leads-incoming', 'estimates-and-bids', 'active-installs', 'permitting-and-hoa', 'service-and-repair'].includes(c.name)
  );
  
  const fieldOfficeChannels = channels.filter(c => 
    c.type !== 'dm' && ['tech-support', 'material-orders', 'design-engineering'].includes(c.name)
  );

  const renderChannelList = (channelList: typeof channels) => (
    channelList.map((channel) => (
      <div key={channel.id} className="flex items-center gap-1 group/channel">
        <button
          onClick={() => onChannelSelect(channel.name)}
          className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-all ${
            activeChannelId === channel.name
              ? 'bg-gradient-to-r from-[#00d4aa]/10 to-transparent border-l-2 border-[#00d4aa] text-white font-medium'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          }`}
          title={channel.description || undefined}
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
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover/channel:opacity-100 transition-opacity"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedChannel(channel);
                  setShowChannelSettings(true);
                }}
                className="text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                <Settings className="w-3 h-3 mr-2" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Delete channel "${channel.name}"? This cannot be undone.`)) {
                    deleteChannelMutation.mutate({ channelId: channel.id });
                  }
                }}
                className="text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    ))
  );

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
            <p className="text-xs text-slate-500">{onlineUsers.length} online</p>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowCreateChannel(true)}
              title="Create Channel"
            >
              <Plus className="w-4 h-4 text-[#00d4aa]" />
            </Button>
          )}
        </div>
      </div>

      {/* Channels Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {/* Mission Control */}
          {missionControlChannels.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('mission-control')}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Control</span>
                {expandedCategories['mission-control'] ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                )}
              </button>
              {expandedCategories['mission-control'] && (
                <div className="mt-1 space-y-0.5">
                  {renderChannelList(missionControlChannels)}
                </div>
              )}
            </div>
          )}

          {/* Job Lifecycle */}
          {jobLifecycleChannels.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('job-lifecycle')}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Job Lifecycle</span>
                {expandedCategories['job-lifecycle'] ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                )}
              </button>
              {expandedCategories['job-lifecycle'] && (
                <div className="mt-1 space-y-0.5">
                  {renderChannelList(jobLifecycleChannels)}
                </div>
              )}
            </div>
          )}

          {/* Field vs Office */}
          {fieldOfficeChannels.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('field-office')}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group"
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Field vs Office</span>
                {expandedCategories['field-office'] ? (
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
                )}
              </button>
              {expandedCategories['field-office'] && (
                <div className="mt-1 space-y-0.5">
                  {renderChannelList(fieldOfficeChannels)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        {dmChannels.length > 0 && (
          <div className="p-3 border-t border-slate-800/50">
            <button
              onClick={() => toggleCategory('direct-messages')}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group mb-2"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Messages</span>
              </div>
              {expandedCategories['direct-messages'] ? (
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
              )}
            </button>
            
            {expandedCategories['direct-messages'] && (
              <div className="space-y-0.5">
                {dmChannels.map((channel) => {
                  const partner = getDMPartner(channel);
                  const displayName = partner?.userName || partner?.userEmail || 'Unknown User';
                  
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel.id.toString())}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group ${
                        activeChannelId === channel.name
                          ? 'bg-gradient-to-r from-[#00d4aa]/10 to-transparent border-l-2 border-[#00d4aa] text-white font-medium'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarImage src={partner?.userImage || undefined} alt={displayName} />
                        <AvatarFallback className="bg-slate-700 text-xs text-white">
                          {displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs">{displayName}</span>
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <span className="bg-[#00d4aa] text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0 ml-auto">
                          {channel.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Team Section */}
        {teamMembers && teamMembers.length > 0 && (
          <div className="p-3 border-t border-slate-800/50">
            <button
              onClick={() => toggleCategory('team')}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/30 rounded transition-colors group mb-2"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team</span>
              </div>
              {expandedCategories['team'] ? (
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
              )}
            </button>
            
            {expandedCategories['team'] && (
              <div className="space-y-0.5">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      console.log('Team member clicked:', member.id, member.name);
                      getOrCreateDMMutation.mutate({ targetUserId: member.id });
                    }}
                    disabled={getOrCreateDMMutation.isPending}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all hover:bg-slate-800/50 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={member.image || undefined} alt={member.name || 'User'} />
                      <AvatarFallback className="bg-slate-700 text-xs text-white">
                        {(member.name || member.email || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-slate-300 truncate group-hover:text-white transition-colors">
                        {member.name || member.email}
                      </p>
                      {member.role && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {member.role}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

      {/* Create Channel Modal */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new channel for team communication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Channel Name</label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g., project-updates"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Description (Optional)</label>
              <Textarea
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                placeholder="What is this channel for?"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Allowed Roles (Optional)</label>
              <div className="space-y-2">
                {['owner', 'admin', 'office', 'sales_rep', 'team_lead', 'field_crew'].map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role));
                        }
                      }}
                    />
                    <span className="text-sm text-slate-300 capitalize">{role.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateChannel(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newChannelName.trim()) {
                    toast.error('Channel name is required');
                    return;
                  }
                  createChannelMutation.mutate({
                    name: newChannelName.trim(),
                    description: newChannelDescription.trim() || undefined,
                    allowedRoles: selectedRoles.length > 0 ? selectedRoles : undefined,
                  });
                }}
                disabled={createChannelMutation.isPending}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Channel Settings Modal */}
      <Dialog open={showChannelSettings} onOpenChange={setShowChannelSettings}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Channel Settings: {selectedChannel?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage channel members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Current Members</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedChannel?.members?.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-2 rounded bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.userImage || undefined} />
                        <AvatarFallback className="bg-slate-700 text-xs">
                          {(member.userName || member.userEmail || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-300">{member.userName || member.userEmail}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                      onClick={() => {
                        if (selectedChannel && confirm(`Remove ${member.userName || member.userEmail} from channel?`)) {
                          removeMemberMutation.mutate({
                            channelId: selectedChannel.id,
                            userId: member.userId,
                          });
                        }
                      }}
                    >
                      <UserMinus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Add Members</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {teamMembers?.filter(tm => !selectedChannel?.members?.some(m => m.userId === tm.id)).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback className="bg-slate-700 text-xs">
                          {(member.name || member.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-300">{member.name || member.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[#00d4aa] hover:text-[#00b894]"
                      onClick={() => {
                        if (selectedChannel) {
                          addMemberMutation.mutate({
                            channelId: selectedChannel.id,
                            userId: member.id,
                          });
                        }
                      }}
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
