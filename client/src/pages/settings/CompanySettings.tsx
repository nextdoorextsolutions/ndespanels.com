import { useState, useEffect } from "react";
import SettingsLayout from "./SettingsLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

export default function CompanySettings() {
  const [formData, setFormData] = useState({
    companyName: "",
    logoUrl: "",
    companyEmail: "",
    companyPhone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    contractorLicenseNumber: "",
    beaconAccountNumber: "",
    beaconBranchCode: "",
  });

  // Fetch company settings
  const { data: settings, isLoading } = trpc.users.getCompanySettings.useQuery();

  // Update mutation
  const updateSettings = trpc.users.updateCompanySettings.useMutation({
    onSuccess: () => {
      toast.success("Company settings saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "",
        logoUrl: settings.logoUrl || "",
        companyEmail: settings.companyEmail || "",
        companyPhone: settings.companyPhone || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        contractorLicenseNumber: settings.contractorLicenseNumber || "",
        beaconAccountNumber: settings.beaconAccountNumber || "",
        beaconBranchCode: settings.beaconBranchCode || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <SettingsLayout title="Company Settings" description="Manage your business information">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Company Settings" 
      description="Manage your business information, logo, and supplier defaults"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#00d4aa]" />
            Company Identity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Company Name *</label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Logo URL</label>
              <Input
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <Input
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Phone</label>
              <Input
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Business Address</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Street Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">State</label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                  placeholder="FL"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">ZIP Code</label>
                <Input
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Licensing */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Licensing</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Contractor License Number</label>
            <Input
              value={formData.contractorLicenseNumber}
              onChange={(e) => setFormData({ ...formData, contractorLicenseNumber: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>

        {/* Supplier Defaults */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Supplier Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Beacon Account Number</label>
              <Input
                value={formData.beaconAccountNumber}
                onChange={(e) => setFormData({ ...formData, beaconAccountNumber: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Beacon Branch Code</label>
              <Input
                value={formData.beaconBranchCode}
                onChange={(e) => setFormData({ ...formData, beaconBranchCode: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button
            type="submit"
            disabled={updateSettings.isPending}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
          >
            {updateSettings.isPending ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  );
}
