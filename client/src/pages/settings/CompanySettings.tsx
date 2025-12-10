import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SettingsLayout from "./SettingsLayout";
import { Link } from "wouter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { companySettingsSchema, type CompanySettingsFormData } from "@/lib/validations/companySettings";
import { GeneralInfoForm } from "@/components/settings/company/GeneralInfoForm";
import { BrandingForm } from "@/components/settings/company/BrandingForm";
import { CredentialsForm } from "@/components/settings/company/CredentialsForm";
import { DefaultsForm } from "@/components/settings/company/DefaultsForm";
import { LegalForm } from "@/components/settings/company/LegalForm";
import { useState } from "react";

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
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  
  // Custom hook for company settings
  const { settings, isLoading, isSaving, saveSettings } = useCompanySettings();
  
  // Initialize react-hook-form with Zod validation
  const form = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: "NextDoor Exterior Solutions",
      quoteExpirationDays: 30,
      laborWarrantyYears: 10,
      materialWarrantyYears: 25,
      defaultDepositPercent: 50,
      preferredSupplier: "Beacon",
      defaultShingleBrand: "GAF Timberline HDZ",
    },
  });
  
  // Load settings into form when data arrives
  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName || "NextDoor Exterior Solutions",
        legalEntityType: settings.legalEntityType || undefined,
        dbaName: settings.dbaName || "",
        logoUrl: settings.logoUrl || "",
        companyEmail: settings.companyEmail || "",
        companyPhone: settings.companyPhone || "",
        websiteUrl: settings.websiteUrl || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        taxId: settings.taxId || "",
        contractorLicenseNumber: settings.contractorLicenseNumber || "",
        insurancePolicyNumber: settings.insurancePolicyNumber || "",
        insuranceExpirationDate: settings.insuranceExpirationDate 
          ? new Date(settings.insuranceExpirationDate).toISOString().split('T')[0] 
          : "",
        insuranceProvider: settings.insuranceProvider || "",
        bondingInfo: settings.bondingInfo || "",
        quoteExpirationDays: settings.quoteExpirationDays || 30,
        laborWarrantyYears: settings.laborWarrantyYears || 10,
        materialWarrantyYears: settings.materialWarrantyYears || 25,
        defaultDepositPercent: parseFloat(settings.defaultDepositPercent || "50"),
        paymentTerms: settings.paymentTerms || "",
        termsAndConditions: settings.termsAndConditions || "",
        cancellationPolicy: settings.cancellationPolicy || "",
        privacyPolicyUrl: settings.privacyPolicyUrl || "",
        beaconAccountNumber: settings.beaconAccountNumber || "",
        beaconBranchCode: settings.beaconBranchCode || "",
        preferredSupplier: settings.preferredSupplier || "Beacon",
        defaultShingleBrand: settings.defaultShingleBrand || "GAF Timberline HDZ",
      });
    }
  }, [settings, form]);

  // Check user role for access control
  useEffect(() => {
    const checkRole = async () => {
      if (!supabase) {
        setIsCheckingRole(false);
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setIsCheckingRole(false);
          return;
        }

        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('open_id', session.user.id)
          .single();

        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkRole();
  }, []);

  // Form submission handler
  const onSubmit = async (data: CompanySettingsFormData) => {
    try {
      await saveSettings(data);
    } catch (error) {
      // Error already handled by hook
      console.error('Save failed:', error);
    }
  };

  // Show loading state while checking role
  if (isCheckingRole) {
    return (
      <SettingsLayout title="Company Settings" description="Business information and legal compliance">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
        </div>
      </SettingsLayout>
    );
  }

  // Check if user is owner
  if (userRole !== 'owner' && userRole !== 'OWNER') {
    return <AccessDenied />;
  }

  return (
    <SettingsLayout title="Company Settings" description="Business information and legal compliance">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Branding */}
        <BrandingForm form={form} />
        
        <Separator className="bg-slate-700" />
        
        {/* General Info */}
        <GeneralInfoForm form={form} />
        
        <Separator className="bg-slate-700" />
        
        {/* Credentials */}
        <CredentialsForm form={form} />
        
        <Separator className="bg-slate-700" />
        
        {/* Business Defaults */}
        <DefaultsForm form={form} />
        
        <Separator className="bg-slate-700" />
        
        {/* Legal & Compliance */}
        <LegalForm form={form} />
        
        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
          <Button
            type="submit"
            disabled={isSaving || isLoading}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  );
}
