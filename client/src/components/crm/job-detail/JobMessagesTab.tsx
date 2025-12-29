import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MentionInput } from "@/components/MentionInput";
import { Send, MessageSquare, Search, FolderOpen, FileText, Image as ImageIcon, Download, Eye } from "lucide-react";
import { TagSelector } from "./TagSelector";
import { ActivityTag } from "@/types/activity";

interface Message {
  id: number;
  description: string;
  activityType: string;
  createdAt: Date | string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  attachments?: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType: string | null;
  }[];
}

interface Document {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: Date | string;
}

type FilterType = 'all' | 'files' | 'images';

interface JobMessagesTabProps {
  messages: Message[];
  documents: Document[];
  canEdit: boolean;
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  formatMentions: (text: string) => React.ReactNode;
  selectedTags: ActivityTag[];
  onTagsChange: (tags: ActivityTag[]) => void;
}

export function JobMessagesTab({
  messages,
  documents,
  canEdit,
  newMessage,
  onMessageChange,
  onSendMessage,
  isSending,
  formatMentions,
  selectedTags,
  onTagsChange,
}: JobMessagesTabProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter messages based on filter type and search query
  const filteredMessages = messages.filter((msg) => {
    // Apply search filter
    if (searchQuery && !msg.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Apply type filter
    if (filterType === 'files') {
      return msg.attachments && msg.attachments.length > 0;
    }
    if (filterType === 'images') {
      return msg.attachments && msg.attachments.some(att => att.fileType?.startsWith('image/'));
    }
    return true;
  });

  // Group documents by type
  const imageDocuments = documents.filter(doc => doc.fileType?.startsWith('image/'));
  const otherDocuments = documents.filter(doc => !doc.fileType?.startsWith('image/'));

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        {/* Header with Search and Asset Sidebar Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Notes & Messages ({messages.length})</h2>
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Job Assets
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-800 border-slate-700 w-[400px] sm:w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white">Job Assets</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Photos Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-[#00d4aa]" />
                    <h3 className="text-sm font-semibold text-white">Photos ({imageDocuments.length})</h3>
                  </div>
                  {imageDocuments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {imageDocuments.map((doc) => (
                        <Card key={doc.id} className="bg-slate-700 border-slate-600 hover:border-[#00d4aa] transition-colors cursor-pointer group">
                          <CardContent className="p-3">
                            <div className="aspect-video bg-slate-600 rounded-lg mb-2 overflow-hidden">
                              <img 
                                src={doc.fileUrl} 
                                alt={doc.fileName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xs text-slate-300 truncate mb-1">{doc.fileName}</p>
                            <div className="flex gap-1">
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button size="sm" variant="ghost" className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-600">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </a>
                              <a href={doc.fileUrl} download className="flex-1">
                                <Button size="sm" variant="ghost" className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-600">
                                  <Download className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No photos uploaded</p>
                  )}
                </div>

                {/* Documents Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Documents ({otherDocuments.length})</h3>
                  </div>
                  {otherDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {otherDocuments.map((doc) => (
                        <Card key={doc.id} className="bg-slate-700 border-slate-600 hover:border-blue-400 transition-colors cursor-pointer group">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{doc.fileName}</p>
                                <p className="text-xs text-slate-400">
                                  {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-600">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </a>
                                <a href={doc.fileUrl} download>
                                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-600">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No documents uploaded</p>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className={filterType === 'all' 
              ? 'bg-[#00d4aa] hover:bg-[#00b894] text-black' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-700'
            }
          >
            All
          </Button>
          <Button
            variant={filterType === 'files' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('files')}
            className={filterType === 'files' 
              ? 'bg-[#00d4aa] hover:bg-[#00b894] text-black' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-700'
            }
          >
            <FileText className="w-3 h-3 mr-1" />
            Files
          </Button>
          <Button
            variant={filterType === 'images' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('images')}
            className={filterType === 'images' 
              ? 'bg-[#00d4aa] hover:bg-[#00b894] text-black' 
              : 'border-slate-600 text-slate-300 hover:bg-slate-700'
            }
          >
            <ImageIcon className="w-3 h-3 mr-1" />
            Images
          </Button>
        </div>

        {/* New Message Input */}
        {canEdit && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="pt-4">
              {/* Tag Selector */}
              <div className="mb-3">
                <TagSelector 
                  selectedTags={selectedTags}
                  onChange={onTagsChange}
                />
              </div>
              
              {/* Message Input */}
              <div className="flex gap-3">
                <MentionInput
                  placeholder="Add a note or message... (Type @ to mention someone)"
                  value={newMessage}
                  onChange={onMessageChange}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 flex-1"
                  minHeight="80px"
                />
                <Button 
                  onClick={onSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-black self-end"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages List */}
        {filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages.map((msg) => {
            const isCustomerMessage = msg.activityType === "customer_message";
            const isCallbackRequest = msg.activityType === "callback_requested";
            const isFromCustomer = isCustomerMessage || isCallbackRequest;
            
            return (
              <Card 
                key={msg.id} 
                className={`border ${isFromCustomer ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isFromCustomer 
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-br from-[#00d4aa] to-[#00b894]'
                    }`}>
                      <span className={`font-semibold text-sm ${isFromCustomer ? 'text-white' : 'text-black'}`}>
                        {isFromCustomer ? 'C' : (msg.user?.name?.charAt(0) || msg.user?.email?.charAt(0) || "?")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-white">
                          {isFromCustomer ? 'Customer' : (msg.user?.name || msg.user?.email || "System")}
                        </p>
                        {isFromCustomer && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isCallbackRequest 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {isCallbackRequest ? '📞 Callback Requested' : '💬 Customer Message'}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{formatMentions(msg.description)}</p>
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <a 
                              key={att.id}
                              href={att.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-[#00d4aa] transition-colors group"
                            >
                              {att.fileType?.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-[#00d4aa]" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-400" />
                              )}
                              <span className="text-sm text-slate-300 group-hover:text-white">{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400">
                {searchQuery || filterType !== 'all' 
                  ? 'No messages match your filters' 
                  : 'No messages yet'
                }
              </p>
              {canEdit && !searchQuery && filterType === 'all' && (
                <p className="text-sm text-slate-500 mt-1">Start the conversation by adding a note above</p>
              )}
              {(searchQuery || filterType !== 'all') && (
                <Button 
                  variant="link" 
                  className="mt-2 text-[#00d4aa]"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
