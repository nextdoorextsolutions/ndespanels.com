import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Upload, MapPin, FileText, Truck, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import SettingsLayout from "./SettingsLayout";
import { Link } from "wouter";

// Access Denied component for non-owners
function AccessDenied() {
  return (
    <SettingsLayout title="Company Settings" description="Business information and supplier defaults">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md mb-6">
          Only company owners can access and modify company settings. 
          Please contact your administrator if you need to make changes.
        </p>
        <Link href="/crm">
          <Button className="bg-[#00d4aa] hover:bg-[#00b894] text-black">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </SettingsLayout>
  );
}

export default function CompanySettings() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Company Info
  const [companyName, setCompanyName] = useState("NextDoor Exterior Solutions");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyZip, setCompanyZip] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  
  // Supplier Defaults
  const [beaconAccountNumber, setBeaconAccountNumber] = useState("");
  const [beaconBranchCode, setBeaconBranchCode] = useState("");
  const [preferredSupplier, setPreferredSupplier] = useState("Beacon");
  const [defaultShingleBrand, setDefaultShingleBrand] = useState("GAF Timberline HDZ");

  // Check user role
  useEffect(() => {
    const checkRole = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('open_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching role:', error);
          setIsLoading(false);
          return;
        }

        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkRole();
  }, []);

  const handleSaveCompanyInfo = () => {
    toast.success("Company information saved!");
  };

  const handleSaveSupplierDefaults = () => {
    toast.success("Supplier defaults saved!");
  };

  const handleUploadLogo = () => {
    toast.info("Logo upload coming soon!");
  };

  // Show loading state
  if (isLoading) {
    return (
      <SettingsLayout title="Company Settings" description="Business information and supplier defaults">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
        </div>
      </SettingsLayout>
    );
  }

  // Check if user is owner
  if (userRole !== 'owner' && userRole !== 'OWNER') {
    return <AccessDenied />;
  }

  return (
    <SettingsLayout title="Company Settings" description="Business information and supplier defaults">
      <div className="space-y-8">
        {/* Company Logo */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00d4aa]" />
              Company Logo
            </CardTitle>
            <CardDescription className="text-slate-400">
              Upload your company logo for reports and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-lg bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Button onClick={handleUploadLogo} variant="outline" className="border-slate-600 text-slate-300">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
                <p className="text-xs text-slate-500">PNG, JPG up to 2MB. Recommended: 200x200px</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00d4aa]" />
              Business Information
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your company address and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress" className="text-slate-300">Street Address</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="123 Main Street"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="companyCity" className="text-slate-300">City</Label>
                <Input
                  id="companyCity"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyState" className="text-slate-300">State</Label>
                <Input
                  id="companyState"
                  value={companyState}
                  onChange={(e) => setCompanyState(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyZip" className="text-slate-300">ZIP</Label>
                <Input
                  id="companyZip"
                  value={companyZip}
                  onChange={(e) => setCompanyZip(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone" className="text-slate-300">Phone Number</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveCompanyInfo}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Company Info
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-slate-700" />

        {/* Tax & License */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#00d4aa]" />
              Tax & License Information
            </CardTitle>
            <CardDescription className="text-slate-400">
              Business registration and licensing details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId" className="text-slate-300">Tax ID / EIN</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className="text-slate-300">Contractor License #</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="License number"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="bg-slate-700" />

        {/* Supplier Defaults */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#00d4aa]" />
              Beacon / Supplier Defaults
            </CardTitle>
            <CardDescription className="text-slate-400">
              Default settings for material orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beaconAccount" className="text-slate-300">Beacon Account Number</Label>
                <Input
                  id="beaconAccount"
                  value={beaconAccountNumber}
                  onChange={(e) => setBeaconAccountNumber(e.target.value)}
                  placeholder="Account #"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beaconBranch" className="text-slate-300">Branch Code</Label>
                <Input
                  id="beaconBranch"
                  value={beaconBranchCode}
                  onChange={(e) => setBeaconBranchCode(e.target.value)}
                  placeholder="Branch code"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredSupplier" className="text-slate-300">Preferred Supplier</Label>
                <Input
                  id="preferredSupplier"
                  value={preferredSupplier}
                  onChange={(e) => setPreferredSupplier(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultShingle" className="text-slate-300">Default Shingle Brand</Label>
                <Input
                  id="defaultShingle"
                  value={defaultShingleBrand}
                  onChange={(e) => setDefaultShingleBrand(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSupplierDefaults}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Supplier Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
