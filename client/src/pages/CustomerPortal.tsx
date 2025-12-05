import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  Search, 
  Phone, 
  MessageSquare, 
  PhoneCall, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Home,
  Loader2
} from "lucide-react";

// Status display mapping for customers (friendly names)
const STATUS_DISPLAY: Record<string, { label: string; color: string; description: string }> = {
  lead: { label: "Received", color: "bg-blue-500", description: "We've received your request" },
  appointment_set: { label: "Appointment Scheduled", color: "bg-cyan-500", description: "Your inspection is scheduled" },
  prospect: { label: "Under Review", color: "bg-purple-500", description: "We're reviewing your property" },
  approved: { label: "Approved", color: "bg-green-500", description: "Your project has been approved" },
  project_scheduled: { label: "Project Scheduled", color: "bg-teal-500", description: "Work is scheduled to begin" },
  completed: { label: "Completed", color: "bg-emerald-500", description: "Project has been completed" },
  invoiced: { label: "Invoice Sent", color: "bg-amber-500", description: "Invoice has been sent" },
  closed_deal: { label: "Closed", color: "bg-green-600", description: "Project is complete and closed" },
  // Legacy statuses
  pending: { label: "Pending", color: "bg-gray-500", description: "Your request is pending" },
  new_lead: { label: "Received", color: "bg-blue-500", description: "We've received your request" },
  contacted: { label: "In Progress", color: "bg-cyan-500", description: "We're working on your request" },
  inspection_scheduled: { label: "Inspection Scheduled", color: "bg-cyan-500", description: "Your inspection is scheduled" },
  inspection_complete: { label: "Inspection Complete", color: "bg-purple-500", description: "Inspection has been completed" },
  report_sent: { label: "Report Sent", color: "bg-green-500", description: "Your report has been sent" },
  follow_up: { label: "In Progress", color: "bg-amber-500", description: "We're following up on your request" },
  closed_won: { label: "Closed", color: "bg-green-600", description: "Project is complete" },
  closed_lost: { label: "Closed", color: "bg-gray-500", description: "Request has been closed" },
  cancelled: { label: "Cancelled", color: "bg-red-500", description: "Request has been cancelled" },
  lien_legal: { label: "In Process", color: "bg-orange-500", description: "Your project is being processed" },
};

export default function CustomerPortal() {
  const [phone, setPhone] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");

  // Lookup jobs by phone
  const { data: lookupResult, isLoading: isSearching, refetch } = trpc.portal.lookupJob.useQuery(
    { phone },
    { enabled: false }
  );

  // Send message mutation
  const sendMessageMutation = trpc.portal.sendMessage.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMessageDialogOpen(false);
      setMessage("");
      setSenderName("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Request callback mutation
  const requestCallbackMutation = trpc.portal.requestCallback.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setCallbackDialogOpen(false);
      setPreferredTime("");
      setCallbackNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSearch = async () => {
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setHasSearched(true);
    await refetch();
  };

  const handleSendMessage = () => {
    if (!selectedJobId || !message.trim()) return;
    sendMessageMutation.mutate({
      jobId: selectedJobId,
      phone,
      message: message.trim(),
      senderName: senderName.trim() || undefined,
    });
  };

  const handleRequestCallback = () => {
    if (!selectedJobId) return;
    requestCallbackMutation.mutate({
      jobId: selectedJobId,
      phone,
      preferredTime: preferredTime.trim() || undefined,
      notes: callbackNotes.trim() || undefined,
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg">NEXTDOOR</span>
              <span className="text-cyan-400 font-bold text-lg ml-1">EXTERIOR</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Check Your <span className="text-cyan-400">Job Status</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Enter your phone number to view the status of your project, send us a message, or request a callback.
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-xl mx-auto bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Look Up Your Project
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter the phone number you used when requesting your storm report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || phone.length < 10}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {hasSearched && (
          <div className="max-w-3xl mx-auto">
            {isSearching ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-slate-400">Searching for your projects...</p>
              </div>
            ) : lookupResult?.found && lookupResult.jobs.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Found {lookupResult.jobs.length} project{lookupResult.jobs.length > 1 ? "s" : ""}
                </h2>
                
                {lookupResult.jobs.map((job) => {
                  const statusInfo = STATUS_DISPLAY[job.status] || STATUS_DISPLAY.pending;
                  
                  return (
                    <Card key={job.id} className="bg-slate-800/50 border-slate-700 overflow-hidden">
                      {/* Status Banner */}
                      <div className={`${statusInfo.color} px-6 py-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            <span className="text-white font-semibold">{statusInfo.label}</span>
                          </div>
                          <span className="text-white/80 text-sm">
                            Started {formatDate(job.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <CardContent className="p-6">
                        {/* Customer Status Message (if set) */}
                        {job.customerStatusMessage && (
                          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                            <h3 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Status Update
                            </h3>
                            <p className="text-white whitespace-pre-wrap">{job.customerStatusMessage}</p>
                          </div>
                        )}

                        {/* If no custom message, show default status description */}
                        {!job.customerStatusMessage && (
                          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                            <p className="text-slate-300">{statusInfo.description}</p>
                          </div>
                        )}
                        
                        {/* Property Info */}
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-cyan-400 mt-0.5" />
                            <div>
                              <p className="text-slate-400 text-sm">Property Address</p>
                              <p className="text-white">{job.address}</p>
                              <p className="text-slate-300">{job.cityStateZip}</p>
                            </div>
                          </div>
                          
                          {job.scheduledDate && (
                            <div className="flex items-start gap-3">
                              <Calendar className="w-5 h-5 text-cyan-400 mt-0.5" />
                              <div>
                                <p className="text-slate-400 text-sm">Scheduled Appointment</p>
                                <p className="text-white">{formatDate(job.scheduledDate)}</p>
                                <p className="text-slate-300">{formatTime(job.scheduledDate)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timeline (limited public view) */}
                        {job.timeline && job.timeline.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-cyan-400" />
                              Recent Activity
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {job.timeline.slice(0, 5).map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 text-sm">
                                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5" />
                                  <div className="flex-1">
                                    <p className="text-slate-300">{activity.description}</p>
                                    <p className="text-slate-500 text-xs">
                                      {formatDate(activity.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
                          <Button
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setMessageDialogOpen(true);
                            }}
                            variant="outline"
                            className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send a Message
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setCallbackDialogOpen(true);
                            }}
                            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                          >
                            <PhoneCall className="w-4 h-4 mr-2" />
                            Request a Call
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
                  <p className="text-slate-400 mb-6">
                    We couldn't find any projects associated with this phone number.
                  </p>
                  <p className="text-slate-500 text-sm">
                    If you believe this is an error, please call us at{" "}
                    <a href="tel:+1234567890" className="text-cyan-400 hover:underline">
                      (123) 456-7890
                    </a>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-slate-600" />
            </div>
            <p className="text-slate-500">
              Enter your phone number above to get started
            </p>
          </div>
        )}
      </main>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Send a Message
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Send a message to our team regarding your project. We'll respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="senderName" className="text-slate-300">Your Name (optional)</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="John Smith"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-slate-300">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="bg-slate-700 border-slate-600 text-white resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMessageDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Callback Request Dialog */}
      <Dialog open={callbackDialogOpen} onOpenChange={setCallbackDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-cyan-400" />
              Request a Callback
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              A team member will contact you within <strong className="text-cyan-400">48 business hours</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
              <p className="text-cyan-300 text-sm">
                We'll call you at the phone number on file. If you need to update your contact information, please include it in the notes below.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preferredTime" className="text-slate-300">Preferred Time to Call (optional)</Label>
              <Input
                id="preferredTime"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                placeholder="e.g., Weekday mornings, After 5pm"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="callbackNotes" className="text-slate-300">Additional Notes (optional)</Label>
              <Textarea
                id="callbackNotes"
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Let us know what you'd like to discuss..."
                rows={3}
                className="bg-slate-700 border-slate-600 text-white resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCallbackDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestCallback}
              disabled={requestCallbackMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {requestCallbackMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <PhoneCall className="w-4 h-4 mr-2" />
              )}
              Request Callback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} NextDoor Exterior Solutions. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Questions? Call us at{" "}
            <a href="tel:+1234567890" className="text-cyan-400 hover:underline">
              (123) 456-7890
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
