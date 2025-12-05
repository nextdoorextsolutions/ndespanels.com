import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Phone, User, Plus } from "lucide-react";
import { toast } from "sonner";
import CRMLayout from "@/components/crm/CRMLayout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [assignedRep, setAssignedRep] = useState<string>("");

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

  const { data: appointments, refetch } = trpc.crm.getAppointments.useQuery({
    startDate,
    endDate,
  });

  const { data: team } = trpc.crm.getTeam.useQuery();
  const { data: leads } = trpc.crm.getLeads.useQuery({ status: "new_lead" });

  const scheduleMutation = trpc.crm.scheduleAppointment.useMutation({
    onSuccess: () => {
      toast.success("Appointment scheduled successfully");
      setShowScheduleDialog(false);
      setSelectedLead(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  }, [startDate, endDate]);

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, typeof appointments> = {};
    appointments?.forEach(apt => {
      if (apt.scheduledDate) {
        const dateKey = new Date(apt.scheduledDate).toDateString();
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey]!.push(apt);
      }
    });
    return grouped;
  }, [appointments]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSchedule = () => {
    if (!selectedLead || !selectedDate) return;
    
    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    scheduleMutation.mutate({
      leadId: selectedLead,
      scheduledDate: scheduledDateTime.toISOString(),
      assignedTo: assignedRep ? parseInt(assignedRep) : undefined,
    });
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
      <div className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduling Calendar</h1>
            <p className="text-sm text-gray-500">Manage inspections and appointments</p>
          </div>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Schedule New Inspection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-gray-700">Select Lead</Label>
                  <Select value={selectedLead?.toString() || ""} onValueChange={(v) => setSelectedLead(parseInt(v))}>
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Choose a lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id.toString()}>
                          {lead.fullName} - {lead.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700">Date</Label>
                  <Input 
                    type="date" 
                    value={selectedDate?.toISOString().split("T")[0] || ""} 
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="bg-white border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Time</Label>
                  <Input 
                    type="time" 
                    value={scheduleTime} 
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-white border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Assign To</Label>
                  <Select value={assignedRep} onValueChange={setAssignedRep}>
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {team?.filter(m => m.role === "sales_rep" || m.role === "project_manager").map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black" 
                  onClick={handleSchedule}
                  disabled={!selectedLead || !selectedDate || scheduleMutation.isPending}
                >
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule Inspection"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl text-gray-900">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                const dateKey = date.toDateString();
                const dayAppointments = appointmentsByDate[dateKey] || [];
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-1 border rounded-md cursor-pointer transition-colors ${
                      isCurrentMonthDay ? "bg-white hover:bg-gray-50" : "bg-gray-50"
                    } ${isTodayDate ? "border-[#00d4aa] border-2" : "border-gray-200"}`}
                    onClick={() => {
                      setSelectedDate(date);
                      if (dayAppointments.length === 0) {
                        setShowScheduleDialog(true);
                      }
                    }}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate ? "text-[#00d4aa]" : isCurrentMonthDay ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Appointments */}
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((apt: any) => (
                        <div
                          key={apt.id}
                          className="text-xs p-1 rounded bg-[#00d4aa]/20 text-[#00d4aa] truncate font-medium"
                          title={apt.title}
                        >
                          {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#00d4aa]" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentsByDate[new Date().toDateString()]?.length ? (
              <div className="space-y-3">
                {appointmentsByDate[new Date().toDateString()]?.map((apt: any) => (
                  <div key={apt.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="w-12 h-12 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[#00d4aa]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{apt.title}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {apt.lead && (
                          <>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {apt.lead.address}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {apt.lead.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {apt.assignedTo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        {apt.assignedTo.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
