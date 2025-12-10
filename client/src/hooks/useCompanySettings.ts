import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import type { CompanySettingsFormData } from '@/lib/validations/companySettings';

/**
 * Custom hook for managing company settings
 * Handles data fetching, mutations, and toast notifications
 */
export function useCompanySettings() {
  // Fetch company settings
  const {
    data: settings,
    isLoading,
    error: fetchError,
    refetch,
  } = trpc.companySettings.get.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update mutation
  const updateMutation = trpc.companySettings.update.useMutation({
    onSuccess: () => {
      toast.success('Settings saved successfully!', {
        description: 'Your company settings have been updated.',
      });
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to save settings', {
        description: error.message || 'Please try again or contact support.',
      });
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = trpc.companySettings.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success('Logo uploaded successfully!');
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to upload logo', {
        description: error.message,
      });
    },
  });

  // Show error toast if initial fetch fails
  useEffect(() => {
    if (fetchError) {
      toast.error('Failed to load company settings', {
        description: fetchError.message,
      });
    }
  }, [fetchError]);

  /**
   * Save company settings
   * @param data - Validated form data from Zod schema
   */
  const saveSettings = async (data: CompanySettingsFormData) => {
    try {
      await updateMutation.mutateAsync({
        companyName: data.companyName,
        legalEntityType: data.legalEntityType || null,
        dbaName: data.dbaName || null,
        logoUrl: data.logoUrl || null,
        companyEmail: data.companyEmail || null,
        companyPhone: data.companyPhone || null,
        websiteUrl: data.websiteUrl || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        taxId: data.taxId || null,
        contractorLicenseNumber: data.contractorLicenseNumber || null,
        additionalLicenses: data.additionalLicenses || null,
        insurancePolicyNumber: data.insurancePolicyNumber || null,
        insuranceExpirationDate: data.insuranceExpirationDate || null,
        insuranceProvider: data.insuranceProvider || null,
        bondingInfo: data.bondingInfo || null,
        quoteExpirationDays: data.quoteExpirationDays,
        laborWarrantyYears: data.laborWarrantyYears,
        materialWarrantyYears: data.materialWarrantyYears,
        defaultDepositPercent: data.defaultDepositPercent,
        paymentTerms: data.paymentTerms || null,
        termsAndConditions: data.termsAndConditions || null,
        cancellationPolicy: data.cancellationPolicy || null,
        privacyPolicyUrl: data.privacyPolicyUrl || null,
        beaconAccountNumber: data.beaconAccountNumber || null,
        beaconBranchCode: data.beaconBranchCode || null,
        preferredSupplier: data.preferredSupplier,
        defaultShingleBrand: data.defaultShingleBrand,
      });
    } catch (error) {
      // Error already handled by onError callback
      throw error;
    }
  };

  /**
   * Upload company logo
   * @param logoUrl - URL of the uploaded logo
   */
  const uploadLogo = async (logoUrl: string) => {
    try {
      await uploadLogoMutation.mutateAsync({ logoUrl });
    } catch (error) {
      throw error;
    }
  };

  return {
    // Data
    settings,
    
    // Loading states
    isLoading,
    isSaving: updateMutation.isPending,
    isUploadingLogo: uploadLogoMutation.isPending,
    
    // Error states
    errors: {
      fetch: fetchError,
      save: updateMutation.error,
      upload: uploadLogoMutation.error,
    },
    
    // Actions
    saveSettings,
    uploadLogo,
    refetch,
    
    // Mutation states for granular control
    updateMutation,
    uploadLogoMutation,
  };
}
