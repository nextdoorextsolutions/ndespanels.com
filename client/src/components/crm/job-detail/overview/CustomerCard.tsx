import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Edit2, Save, X, Mail, Phone, MapPin } from "lucide-react";
import type { Job } from "@/types";

interface CustomerCardProps {
  job: Job;
  canEdit: boolean;
  onSave: (data: Partial<Job>) => void;
  isSaving: boolean;
}

export function CustomerCard({ job, canEdit, onSave, isSaving }: CustomerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: job.fullName,
    email: job.email || "",
    phone: job.phone || "",
    address: job.address,
    cityStateZip: job.cityStateZip,
    leadSource: job.leadSource || "website",
    roofAge: job.roofAge || "",
    roofConcerns: job.roofConcerns || "",
    handsOnInspection: job.handsOnInspection || false,
  });

  const handleSave = () => {
    onSave(form);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm({
      fullName: job.fullName,
      email: job.email || "",
      phone: job.phone || "",
      address: job.address,
      cityStateZip: job.cityStateZip,
      leadSource: job.leadSource || "website",
      roofAge: job.roofAge || "",
      roofConcerns: job.roofConcerns || "",
      handsOnInspection: job.handsOnInspection || false,
    });
    setIsEditing(false);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#00d4aa]" />
            Customer Information
          </CardTitle>
          {canEdit && !isEditing && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={handleCancel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Full Name</label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">City, State, ZIP</label>
              <Input
                value={form.cityStateZip}
                onChange={(e) => setForm({ ...form, cityStateZip: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Lead Source</label>
              <Select
                value={form.leadSource}
                onValueChange={(value) => setForm({ ...form, leadSource: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="website" className="text-white hover:bg-slate-600">Website</SelectItem>
                  <SelectItem value="referral" className="text-white hover:bg-slate-600">Referral</SelectItem>
                  <SelectItem value="door_hanger" className="text-white hover:bg-slate-600">Door Hanger</SelectItem>
                  <SelectItem value="cold_call" className="text-white hover:bg-slate-600">Cold Call</SelectItem>
                  <SelectItem value="social_media" className="text-white hover:bg-slate-600">Social Media</SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-slate-600">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400">Roof Age</label>
              <Input
                value={form.roofAge}
                onChange={(e) => setForm({ ...form, roofAge: e.target.value })}
                placeholder="e.g., 15 years"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400">Roof Concerns</label>
              <Textarea
                value={form.roofConcerns}
                onChange={(e) => setForm({ ...form, roofConcerns: e.target.value })}
                placeholder="Describe any roof concerns..."
                className="bg-slate-700 border-slate-600 text-white mt-1"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{job.fullName}</span>
            </div>
            {job.email && (
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${job.email}`} className="hover:text-[#00d4aa]">{job.email}</a>
              </div>
            )}
            {job.phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${job.phone}`} className="hover:text-[#00d4aa]">{job.phone}</a>
              </div>
            )}
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <div>{job.address}</div>
                <div>{job.cityStateZip}</div>
              </div>
            </div>
            {job.leadSource && (
              <div className="pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">Lead Source: </span>
                <span className="text-sm text-slate-300 capitalize">{job.leadSource.replace("_", " ")}</span>
              </div>
            )}
            {job.roofAge && (
              <div>
                <span className="text-xs text-slate-400">Roof Age: </span>
                <span className="text-sm text-slate-300">{job.roofAge}</span>
              </div>
            )}
            {job.roofConcerns && (
              <div>
                <span className="text-xs text-slate-400 block mb-1">Concerns:</span>
                <p className="text-sm text-slate-300">{job.roofConcerns}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
