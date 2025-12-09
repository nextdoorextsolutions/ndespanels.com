/**
 * PDF Template Configuration
 * 
 * This file contains all coordinate mappings for filling PDF templates.
 * Adjust X/Y coordinates here to position text and signatures on your templates.
 * 
 * COORDINATE SYSTEM:
 * - Origin (0,0) is at BOTTOM-LEFT corner
 * - X increases to the right
 * - Y increases upward
 * - Units are in points (72 points = 1 inch)
 * - Standard letter size: 612 x 792 points (8.5" x 11")
 * 
 * TIPS FOR FINDING COORDINATES:
 * 1. Open your template PDF in Adobe Acrobat
 * 2. Use the measuring tool to find coordinates
 * 3. Or use trial and error, adjusting values here
 * 4. Remember: Y coordinate is from BOTTOM, not top!
 */

export interface FieldConfig {
  x: number;        // Horizontal position from left edge
  y: number;        // Vertical position from bottom edge
  size?: number;    // Font size (default: 11)
  maxWidth?: number; // Maximum width for text wrapping
  page?: number;    // Page number (0-indexed, default: 0)
}

export interface TemplateConfig {
  [fieldName: string]: FieldConfig;
}

/**
 * INSURANCE TEMPLATE CONFIGURATION
 * Template: contingency_agreement.pdf
 * 
 * Page 1: Contingency Agreement
 * Page 2: Letter of Authorization & Signatures
 */
export const INSURANCE_CONFIG: TemplateConfig = {
  // ============================================
  // PAGE 1: CUSTOMER INFORMATION
  // ============================================
  customerName: {
    x: 100,
    y: 680,
    size: 12,
    page: 0,
  },
  
  propertyAddress: {
    x: 100,
    y: 655,
    size: 11,
    maxWidth: 400,
    page: 0,
  },
  
  cityStateZip: {
    x: 100,
    y: 630,
    size: 11,
    page: 0,
  },
  
  customerPhone: {
    x: 100,
    y: 605,
    size: 11,
    page: 0,
  },
  
  customerEmail: {
    x: 100,
    y: 580,
    size: 11,
    page: 0,
  },
  
  // ============================================
  // PAGE 1: INSURANCE INFORMATION
  // ============================================
  insuranceCarrier: {
    x: 100,
    y: 530,
    size: 12,
    page: 0,
  },
  
  claimNumber: {
    x: 100,
    y: 505,
    size: 12,
    page: 0,
  },
  
  // ============================================
  // PAGE 1: PRICING INFORMATION
  // ============================================
  roofSquares: {
    x: 100,
    y: 455,
    size: 11,
    page: 0,
  },
  
  pricePerSq: {
    x: 250,
    y: 455,
    size: 11,
    page: 0,
  },
  
  totalPrice: {
    x: 100,
    y: 405,
    size: 14,
    page: 0,
  },
  
  proposalDate: {
    x: 100,
    y: 355,
    size: 10,
    page: 0,
  },
  
  // ============================================
  // PAGE 2: SIGNATURE SECTION
  // ============================================
  customerSignature: {
    x: 80,
    y: 200,
    page: 1,
    // Note: Signature is an image, not text
    // Size will be auto-scaled to max 200x60
  },
  
  signatureDate: {
    x: 350,
    y: 200,
    size: 10,
    page: 1,
  },
};

/**
 * CASH TEMPLATE CONFIGURATION
 * Template: cash_contract.pdf
 * 
 * Page 1: Proposal Details & Pricing
 * Page 2: Terms & Signatures
 */
export const CASH_CONFIG: TemplateConfig = {
  // ============================================
  // PAGE 1: CUSTOMER INFORMATION
  // ============================================
  customerName: {
    x: 100,
    y: 680,
    size: 12,
    page: 0,
  },
  
  propertyAddress: {
    x: 100,
    y: 655,
    size: 11,
    maxWidth: 400,
    page: 0,
  },
  
  cityStateZip: {
    x: 100,
    y: 630,
    size: 11,
    page: 0,
  },
  
  customerPhone: {
    x: 100,
    y: 605,
    size: 11,
    page: 0,
  },
  
  customerEmail: {
    x: 100,
    y: 580,
    size: 11,
    page: 0,
  },
  
  // ============================================
  // PAGE 1: PROPOSAL DATES
  // ============================================
  proposalDate: {
    x: 100,
    y: 530,
    size: 10,
    page: 0,
  },
  
  validUntil: {
    x: 250,
    y: 530,
    size: 10,
    page: 0,
  },
  
  // ============================================
  // PAGE 1: PRICING INFORMATION
  // ============================================
  roofSquares: {
    x: 100,
    y: 455,
    size: 11,
    page: 0,
  },
  
  pricePerSq: {
    x: 250,
    y: 455,
    size: 11,
    page: 0,
  },
  
  totalPrice: {
    x: 100,
    y: 405,
    size: 14,
    page: 0,
  },
  
  // ============================================
  // PAGE 2: SIGNATURE SECTION
  // ============================================
  customerSignature: {
    x: 80,
    y: 200,
    page: 1,
  },
  
  signatureDate: {
    x: 350,
    y: 200,
    size: 10,
    page: 1,
  },
};

/**
 * FINANCED TEMPLATE CONFIGURATION
 * Template: financed_contract.pdf
 * 
 * Uses same layout as cash template but with different payment terms
 */
export const FINANCED_CONFIG: TemplateConfig = {
  ...CASH_CONFIG, // Same coordinates as cash template
};

/**
 * TEMPLATE URLS
 * 
 * Update these to point to your actual template PDFs in Supabase Storage
 * 
 * To upload templates to Supabase:
 * 1. Create a 'templates' bucket in Supabase Storage
 * 2. Upload your PDF templates
 * 3. Make bucket public or set appropriate RLS policies
 * 4. Copy the public URLs here
 * 
 * Or use environment variables:
 * - INSURANCE_TEMPLATE_URL
 * - CASH_TEMPLATE_URL
 * - FINANCED_TEMPLATE_URL
 */
export const TEMPLATE_URLS = {
  insurance: process.env.INSURANCE_TEMPLATE_URL || 
    'https://your-project.supabase.co/storage/v1/object/public/templates/contingency_agreement.pdf',
  
  cash: process.env.CASH_TEMPLATE_URL || 
    'https://your-project.supabase.co/storage/v1/object/public/templates/cash_contract.pdf',
  
  financed: process.env.FINANCED_TEMPLATE_URL || 
    'https://your-project.supabase.co/storage/v1/object/public/templates/financed_contract.pdf',
};

/**
 * HELPER: Get configuration for a deal type
 */
export function getTemplateConfig(dealType: 'insurance' | 'cash' | 'financed'): TemplateConfig {
  switch (dealType) {
    case 'insurance':
      return INSURANCE_CONFIG;
    case 'financed':
      return FINANCED_CONFIG;
    case 'cash':
    default:
      return CASH_CONFIG;
  }
}

/**
 * HELPER: Get template URL for a deal type
 */
export function getTemplateUrl(dealType: 'insurance' | 'cash' | 'financed'): string {
  return TEMPLATE_URLS[dealType];
}

/**
 * COORDINATE CALCULATION HELPERS
 * 
 * These functions help convert from top-based coordinates (like in design tools)
 * to bottom-based coordinates (PDF standard)
 */

/**
 * Convert Y coordinate from top-based to bottom-based
 * @param yFromTop - Y coordinate measured from top of page
 * @param pageHeight - Total page height (default: 792 for letter size)
 */
export function yFromTop(yFromTop: number, pageHeight: number = 792): number {
  return pageHeight - yFromTop;
}

/**
 * Convert inches to points
 * @param inches - Measurement in inches
 */
export function inchesToPoints(inches: number): number {
  return inches * 72;
}

/**
 * EXAMPLE USAGE:
 * 
 * If your design tool shows a field at:
 * - X: 1.5 inches from left
 * - Y: 2 inches from top
 * 
 * Convert to PDF coordinates:
 * {
 *   x: inchesToPoints(1.5),  // = 108
 *   y: yFromTop(inchesToPoints(2)),  // = 648
 * }
 */
