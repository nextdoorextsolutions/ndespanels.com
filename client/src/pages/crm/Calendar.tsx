import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Plus, Video, Phone as PhoneIcon, Users } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type EventType = "inspection" | "call" | "meeting" | "zoom";

const EVENT_TYPE_CONFIG = {
  inspection: { label: "🔍 Inspection", color: "#ef4444", bgClass: "bg-red-500/20", textClass: "text-red-400", borderClass: "border-red-500" },
  call: { label: "📞 Call", color: "#22c55e", bgClass: "bg-green-500/20", textClass: "text-green-400", borderClass: "border-green-500" },
  meeting: { label: "👥 Meeting", color: "#3b82f6", bgClass: "bg-blue-500/20", textClass: "text-blue-400", borderClass: "border-blue-500" },
  zoom: { label: "💻 Zoom", color: "#a855f7", bgClass: "bg-purple-500/20", textClass: "text-purple-400", borderClass: "border-purple-500" },
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  
  // Event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("meeting");
  const [eventTime, setEventTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());
    
    const end = new Date(lastDay);
    end.setDate(end.getDate() + (6 - end.getDay()));
    
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate]);

  const { data: events, refetch } = trpc.events.getEvents.useQuery({
    startDate,
    endDate,
  });

  const { data: team } = trpc.users.getTeam.useQuery();
  const { data: jobs } = trpc.crm.getLeads.useQuery({});

  const createEventMutation = trpc.events.createEvent.useMutation({
    onSuccess: () => {
      toast.success("Event created successfully! Notifications sent to attendees.");
      setShowEventDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventType("meeting");
    setEventTime("09:00");
    setEventEndTime("10:00");
    setAssignedTo("");
    setSelectedAttendees([]);
    setLocation("");
    setMeetingUrl("");
    setSelectedJob(null);
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  }, [startDate, endDate]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, typeof events> = {};
    events?.forEach(evt => {
      if (evt.startTime) {
        const dateKey = new Date(evt.startTime).toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey]!.push(evt);
      }
    });
    return grouped;
  }, [events]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreateEvent = () => {
    if (!eventTitle || !selectedDate) {
      toast.error("Title and date are required");
      return;
    }
    
    const startDateTime = new Date(selectedDate);
    const [hours, minutes] = eventTime.split(":").map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(selectedDate);
    const [endHours, endMinutes] = eventEndTime.split(":").map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    createEventMutation.mutate({
      title: eventTitle,
      description: eventDescription || undefined,
      type: eventType,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      jobId: selectedJob || undefined,
      assignedTo: assignedTo ? parseInt(assignedTo) : undefined,
      attendees: selectedAttendees.length > 0 ? selectedAttendees : undefined,
      location: location || undefined,
      meetingUrl: meetingUrl || undefined,
    });
  };

  const toggleAttendee = (userId: number) => {
    setSelectedAttendees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <CRMLayout>
      <div className="p-6 bg-slate-900 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Calendar</h1>
            <p className="text-sm text-slate-400">Schedule inspections, calls, meetings, and zoom sessions</p>
          </div>
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Event Type */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Event Type *</Label>
                  <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-slate-600">
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Title *</Label>
                  <Input 
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., Roof Inspection - Smith Residence"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Description</Label>
                  <Textarea 
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Additional details..."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300 mb-2 block">Date *</Label>
                    <Input 
                      type="date" 
                      value={selectedDate?.toISOString().split("T")[0] || ""} 
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 mb-2 block">Start Time</Label>
                    <Input 
                      type="time" 
                      value={eventTime} 
                      onChange={(e) => setEventTime(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 mb-2 block">End Time</Label>
                    <Input 
                      type="time" 
                      value={eventEndTime} 
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {team?.map((member: any) => (
                        <SelectItem key={member.id} value={member.id.toString()} className="text-white hover:bg-slate-600">
                          {member.name || member.email} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendees */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Attendees (will receive notifications)</Label>
                  <div className="bg-slate-700 border border-slate-600 rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {team?.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAttendees.includes(member.id)}
                          onCheckedChange={() => toggleAttendee(member.id)}
                          className="border-slate-500"
                        />
                        <span className="text-sm text-slate-300">{member.name || member.email}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Link to Job */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Link to Job (Optional)</Label>
                  <Select value={selectedJob?.toString() || ""} onValueChange={(v) => setSelectedJob(v ? parseInt(v) : null)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select job..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {jobs?.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()} className="text-white hover:bg-slate-600">
                          {job.fullName} - {job.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location or Meeting URL */}
                {eventType === "zoom" ? (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Meeting URL</Label>
                    <Input 
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Location</Label>
                    <Input 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Address or meeting room"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold" 
                  onClick={handleCreateEvent}
                  disabled={!eventTitle || !selectedDate || createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar */}
        <Card className="shadow-sm bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={prevMonth} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl text-white">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                const dateKey = date.toDateString();
                const dayEvents = eventsByDate[dateKey] || [];
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-1 border rounded-md cursor-pointer transition-colors ${
                      isCurrentMonthDay ? "bg-slate-700/50 hover:bg-slate-700" : "bg-slate-800/50"
                    } ${isTodayDate ? "border-[#00d4aa] border-2" : "border-slate-600"}`}
                    onClick={() => {
                      setSelectedDate(date);
                      if (dayEvents.length === 0) {
                        setShowEventDialog(true);
                      }
                    }}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate ? "text-[#00d4aa]" : isCurrentMonthDay ? "text-white" : "text-slate-500"
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((evt: any) => {
                        const config = EVENT_TYPE_CONFIG[evt.type as EventType];
                        return (
                          <div
                            key={evt.id}
                            className={`text-xs p-1 rounded ${config.bgClass} ${config.textClass} truncate font-medium border-l-2 ${config.borderClass}`}
                            title={`${evt.title} - ${evt.type}`}
                            style={{ backgroundColor: `${evt.color}20` }}
                          >
                            {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-slate-400 pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Events */}
        <Card className="mt-6 shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#00d4aa]" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsByDate[new Date().toDateString()]?.length ? (
              <div className="space-y-3">
                {eventsByDate[new Date().toDateString()]?.map((evt: any) => {
                  const config = EVENT_TYPE_CONFIG[evt.type as EventType];
                  return (
                    <div key={evt.id} className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${config.borderClass} bg-slate-700/50`}>
                      <div className={`w-12 h-12 rounded-full ${config.bgClass} flex items-center justify-center`}>
                        {evt.type === "zoom" && <Video className={`w-5 h-5 ${config.textClass}`} />}
                        {evt.type === "call" && <PhoneIcon className={`w-5 h-5 ${config.textClass}`} />}
                        {evt.type === "meeting" && <Users className={`w-5 h-5 ${config.textClass}`} />}
                        {evt.type === "inspection" && <Clock className={`w-5 h-5 ${config.textClass}`} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{evt.title}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {evt.endTime && ` - ${new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {evt.location}
                            </span>
                          )}
                          {evt.assignedUserName && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {evt.assignedUserName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${config.bgClass} ${config.textClass} text-xs font-medium`}>
                        {evt.type}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Legend */}
        <Card className="mt-6 shadow-sm bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${config.bgClass} border-2 ${config.borderClass}`} />
                  <span className="text-sm text-slate-300">{config.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
