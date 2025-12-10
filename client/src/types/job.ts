/**
 * Shared Job/Lead Types
 * 
 * These types match the database schema and provide type safety
 * across the frontend and backend.
 */

/**
 * Solar API Data Structure
 * 
 * CRITICAL: This defines the exact structure returned from Google Solar API
 * and stored in the solarApiData JSONB field.
 * 
 * Key fields for roof measurements:
 * - roofAreaSqMeters: ALWAYS in square meters (from Google Solar API)
 * - totalArea: Calculated field in square feet (roofAreaSqMeters * 10.764)
 */
export interface SolarApiData {
  // Roof measurements
  roofAreaSqMeters: number; // ALWAYS square meters from Google Solar API
  totalArea: number; // Calculated: roofAreaSqMeters * 10.764 (square feet)
  
  // Linear measurements (optional, may not always be available)
  perimeter?: number; // feet
  ridgeLength?: number; // feet
  valleyLength?: number; // feet
  hipLength?: number; // feet
  eaveLength?: number; // feet
  rakeLength?: number; // feet
  
  // Solar coverage flag
  solarCoverage?: boolean; // true if solar panels are present
  
  // Additional metadata
  shingleColor?: string;
  roofComplexity?: 'simple' | 'moderate' | 'complex';
  
  // Raw Google Solar API response (for reference)
  solarPotential?: {
    wholeRoofStats?: {
      areaMeters2: number;
      sunshineQuantiles: number[];
      groundAreaMeters2: number;
    };
    roofSegmentStats?: Array<{
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: {
        areaMeters2: number;
        sunshineQuantiles: number[];
        groundAreaMeters2: number;
      };
      center: {
        latitude: number;
        longitude: number;
      };
      boundingBox: {
        sw: { latitude: number; longitude: number };
        ne: { latitude: number; longitude: number };
      };
      planeHeightAtCenterMeters: number;
    }>;
    solarPanels?: Array<{
      center: { latitude: number; longitude: number };
      orientation: string;
      yearlyEnergyDcKwh: number;
      segmentIndex: number;
    }>;
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    carbonOffsetFactorKgPerMwh?: number;
  };
}

/**
 * Job Status Enum
 * Matches the database statusEnum
 */
export type JobStatus =
  | "lead"
  | "appointment_set"
  | "prospect"
  | "approved"
  | "project_scheduled"
  | "completed"
  | "invoiced"
  | "lien_legal"
  | "closed_deal"
  | "closed_lost";

/**
 * Deal Type Enum
 * Matches the database dealTypeEnum
 */
export type DealType =
  | "insurance"
  | "retail"
  | "warranty";

/**
 * Priority Enum
 * Matches the database priorityEnum
 */
export type Priority = "low" | "medium" | "high" | "urgent";

/**
 * Price Status Enum
 * Matches the database priceStatusEnum
 */
export type PriceStatus = "draft" | "pending_approval" | "negotiation" | "approved";

/**
 * Payment Status Enum
 * Matches the database paymentStatusEnum
 */
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";

/**
 * Lien Rights Status Enum
 * Matches the database lienRightsStatusEnum
 */
export type LienRightsStatus =
  | "not_applicable"
  | "pending"
  | "sent"
  | "expired"
  | "waived";

/**
 * Job/Lead Interface
 * 
 * This matches the report_requests table schema exactly.
 * Use this instead of (job as any) to get proper type safety.
 */
export interface Job {
  id: number;
  
  // Customer info
  fullName: string;
  email: string | null;
  phone: string | null;
  
  // Secondary contact
  secondaryFirstName?: string | null;
  secondaryLastName?: string | null;
  secondaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryRelation?: string | null;
  
  // Property info
  address: string;
  cityStateZip: string;
  latitude?: number | null;
  longitude?: number | null;
  solarApiData?: SolarApiData | null; // JSONB field with proper typing
  estimatorData?: any | null; // JSONB field
  roofAge?: string | null;
  roofConcerns?: string | null;
  handsOnInspection: boolean;
  
  // Site access
  gateCode?: string | null;
  accessInstructions?: string | null;
  
  // Insurance info
  insuranceCarrier?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
  deductible?: string | null; // numeric stored as string
  
  // Payment info
  promoCode?: string | null;
  promoApplied: boolean;
  amountPaid: number;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  
  // CRM fields
  assignedTo?: number | null;
  teamLeadId?: number | null;
  salesRepCode?: string | null;
  leadSource?: string | null;
  
  // Pipeline
  status: JobStatus;
  dealType?: DealType | null;
  
  // Lien rights
  projectCompletedAt?: Date | string | null;
  lienRightsStatus?: LienRightsStatus | null;
  lienRightsExpiresAt?: Date | string | null;
  lastLienRightsNotification?: Date | string | null;
  
  // Payment tracking
  paymentStatus: PaymentStatus;
  
  // Priority and notes
  priority: Priority;
  internalNotes?: string | null;
  customerStatusMessage?: string | null;
  
  // Scheduling
  scheduledDate?: Date | string | null;
  completedDate?: Date | string | null;
  
  // Pricing & Proposal
  pricePerSq?: string | null; // numeric stored as string
  totalPrice?: string | null; // numeric stored as string
  counterPrice?: string | null; // numeric stored as string
  priceStatus?: PriceStatus | null;
  
  // Manual measurements (if solar API fails)
  manualAreaSqFt?: number | null;
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Type guard to check if solarApiData exists and has required fields
 */
export function hasSolarData(job: Job): job is Job & { solarApiData: SolarApiData } {
  return (
    job.solarApiData !== null &&
    job.solarApiData !== undefined &&
    typeof job.solarApiData === 'object' &&
    'roofAreaSqMeters' in job.solarApiData &&
    'totalArea' in job.solarApiData
  );
}

/**
 * Type guard to check if job has manual area measurement
 */
export function hasManualArea(job: Job): job is Job & { manualAreaSqFt: number } {
  return job.manualAreaSqFt !== null && job.manualAreaSqFt !== undefined && job.manualAreaSqFt > 0;
}

/**
 * Get roof area in square feet, preferring solar data over manual entry
 */
export function getRoofAreaSqFt(job: Job): number | null {
  if (hasSolarData(job)) {
    return job.solarApiData.totalArea;
  }
  if (hasManualArea(job)) {
    return job.manualAreaSqFt;
  }
  return null;
}

/**
 * Get the source of the roof area measurement
 */
export function getRoofAreaSource(job: Job): 'solar' | 'manual' | 'none' {
  if (hasSolarData(job)) return 'solar';
  if (hasManualArea(job)) return 'manual';
  return 'none';
}
