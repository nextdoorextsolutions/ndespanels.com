import { z } from 'zod';

/**
 * Company Settings Validation Schema
 * Florida-specific validation rules for roofing contractor compliance
 */

// Florida Contractor License Format:
// CCC = Certified General Contractor
// CGC = Certified General Contractor  
// CBC = Certified Building Contractor
// Followed by 7 digits (e.g., CCC1234567)
const floridaLicenseRegex = /^(CCC|CGC|CBC|CRC)\d{7}$/i;

// Phone format: (XXX) XXX-XXXX
const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;

// EIN format: XX-XXXXXXX
const einRegex = /^\d{2}-\d{7}$/;

// ZIP code: XXXXX or XXXXX-XXXX
const zipRegex = /^\d{5}(-\d{4})?$/;

export const companySettingsSchema = z.object({
  // Identity & Branding
  companyName: z.string()
    .min(1, "Company name is required")
    .max(255, "Company name too long"),
  
  legalEntityType: z.enum(["LLC", "Inc", "Corp", "Sole Proprietor", "Partnership"], {
    message: "Please select a legal entity type"
  }).optional(),
  
  dbaName: z.string()
    .max(255, "DBA name too long")
    .optional()
    .or(z.literal('')),
  
  logoUrl: z.string()
    .url("Invalid logo URL")
    .optional()
    .or(z.literal('')),
  
  // Contact Information
  companyEmail: z.string()
    .email("Invalid email address")
    .max(320, "Email too long")
    .optional()
    .or(z.literal('')),
  
  companyPhone: z.string()
    .regex(phoneRegex, "Phone must be in format: (XXX) XXX-XXXX")
    .optional()
    .or(z.literal('')),
  
  websiteUrl: z.string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal('')),
  
  // Physical Address
  address: z.string()
    .min(1, "Street address is required")
    .max(500, "Address too long"),
  
  city: z.string()
    .min(1, "City is required")
    .max(100, "City name too long"),
  
  state: z.string()
    .length(2, "State must be 2-letter code (e.g., FL)")
    .regex(/^[A-Z]{2}$/, "State must be uppercase 2-letter code"),
  
  zipCode: z.string()
    .regex(zipRegex, "ZIP code must be XXXXX or XXXXX-XXXX format"),
  
  // Tax & Registration
  taxId: z.string()
    .regex(einRegex, "Tax ID must be in format: XX-XXXXXXX")
    .optional()
    .or(z.literal('')),
  
  // Credentials (Critical for Florida Proposals)
  contractorLicenseNumber: z.string()
    .regex(floridaLicenseRegex, "Florida license must start with CCC, CGC, CBC, or CRC followed by 7 digits (e.g., CCC1234567)")
    .min(1, "Contractor license is required for proposals"),
  
  additionalLicenses: z.array(z.object({
    type: z.string().min(1, "License type required"),
    number: z.string().min(1, "License number required"),
    state: z.string().length(2, "State code required"),
    expirationDate: z.string().optional(),
  })).optional(),
  
  insurancePolicyNumber: z.string()
    .min(1, "Insurance policy number is required for proposals")
    .max(100, "Policy number too long"),
  
  insuranceExpirationDate: z.string()
    .refine((date) => {
      const expDate = new Date(date);
      const today = new Date();
      return expDate > today;
    }, "Insurance must not be expired"),
  
  insuranceProvider: z.string()
    .max(255, "Provider name too long")
    .optional()
    .or(z.literal('')),
  
  bondingInfo: z.string()
    .max(1000, "Bonding info too long")
    .optional()
    .or(z.literal('')),
  
  // Business Defaults
  quoteExpirationDays: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 day")
    .max(365, "Cannot exceed 365 days")
    .default(30),
  
  laborWarrantyYears: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 year")
    .max(50, "Cannot exceed 50 years")
    .default(10),
  
  materialWarrantyYears: z.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1 year")
    .max(50, "Cannot exceed 50 years")
    .default(25),
  
  defaultDepositPercent: z.number()
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%")
    .default(50),
  
  paymentTerms: z.string()
    .max(500, "Payment terms too long")
    .optional()
    .or(z.literal('')),
  
  // Legal & Compliance
  termsAndConditions: z.string()
    .min(50, "Terms & Conditions must be at least 50 characters for legal validity")
    .max(10000, "Terms & Conditions too long")
    .optional()
    .or(z.literal('')),
  
  cancellationPolicy: z.string()
    .max(2000, "Cancellation policy too long")
    .optional()
    .or(z.literal('')),
  
  privacyPolicyUrl: z.string()
    .url("Invalid privacy policy URL")
    .optional()
    .or(z.literal('')),
  
  // Supplier Defaults
  beaconAccountNumber: z.string()
    .max(100, "Account number too long")
    .optional()
    .or(z.literal('')),
  
  beaconBranchCode: z.string()
    .max(50, "Branch code too long")
    .optional()
    .or(z.literal('')),
  
  preferredSupplier: z.string()
    .max(100, "Supplier name too long")
    .default("Beacon"),
  
  defaultShingleBrand: z.string()
    .max(100, "Brand name too long")
    .default("GAF Timberline HDZ"),
});

export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;

// Helper function to format phone number as user types
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  
  if (!match) return value;
  
  const [, area, prefix, line] = match;
  
  if (line) {
    return `(${area}) ${prefix}-${line}`;
  } else if (prefix) {
    return `(${area}) ${prefix}`;
  } else if (area) {
    return `(${area}`;
  }
  
  return value;
}

// Helper function to format EIN as user types
export function formatEIN(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,7})$/);
  
  if (!match) return value;
  
  const [, part1, part2] = match;
  
  if (part2) {
    return `${part1}-${part2}`;
  }
  
  return part1;
}

// Helper function to validate Florida license format
export function isValidFloridaLicense(license: string): boolean {
  return floridaLicenseRegex.test(license);
}
