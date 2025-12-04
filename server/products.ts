/**
 * Product configuration for Storm Documentation Report
 */

export const PRODUCTS = {
  STORM_REPORT: {
    name: "Premium Storm Documentation Report",
    description: "Comprehensive storm documentation package including drone imagery, NOAA data, and certified contractor condition summary.",
    priceInCents: 19900, // $199.00
    currency: "usd",
  }
} as const;

// Static promo codes (legacy support)
export const STATIC_PROMO_CODES: Record<string, {
  code: string;
  discountPercent: number;
  description: string;
  salesRep?: string;
}> = {
  // Default/General promo code
  NEIGHBOR25: {
    code: "NEIGHBOR25",
    discountPercent: 100,
    description: "Neighborhood Survey Promo - Fee Waived",
    salesRep: "General Campaign",
  },
  
  // Regional codes
  "PINELLAS25": {
    code: "PINELLAS25",
    discountPercent: 100,
    description: "Pinellas County Campaign - Fee Waived",
    salesRep: "Pinellas Team",
  },
  "HILLSBOROUGH25": {
    code: "HILLSBOROUGH25",
    discountPercent: 100,
    description: "Hillsborough County Campaign - Fee Waived",
    salesRep: "Hillsborough Team",
  },
};

/**
 * Dynamic promo code pattern: Any code ending in "S26"
 * Examples: MJS26, STS26, ABC123S26
 * The prefix before S26 is used as the sales rep identifier
 */
const DYNAMIC_PROMO_PATTERN = /^(.+)S26$/i;

/**
 * Validate a promo code and return discount info with sales rep attribution
 * Supports both static codes and dynamic S26 pattern
 */
export function validatePromoCode(code: string): { 
  valid: boolean; 
  discountPercent: number; 
  description?: string;
  salesRep?: string;
} {
  const normalizedCode = code.toUpperCase().trim();
  
  // First check static promo codes
  const staticEntry = Object.values(STATIC_PROMO_CODES).find(p => p.code === normalizedCode);
  
  if (staticEntry) {
    return {
      valid: true,
      discountPercent: staticEntry.discountPercent,
      description: staticEntry.description,
      salesRep: staticEntry.salesRep,
    };
  }
  
  // Check dynamic S26 pattern (any code ending in S26)
  const dynamicMatch = normalizedCode.match(DYNAMIC_PROMO_PATTERN);
  
  if (dynamicMatch) {
    const repInitials = dynamicMatch[1]; // Everything before "S26"
    return {
      valid: true,
      discountPercent: 100, // 100% off = free
      description: "Sales Rep Promo - Fee Waived",
      salesRep: repInitials, // Use the initials as the rep identifier
    };
  }
  
  return { valid: false, discountPercent: 0 };
}

/**
 * Get all static promo codes (for admin reference)
 * Note: Dynamic S26 codes are not listed as they are generated on-the-fly
 */
export function getAllPromoCodes() {
  return [
    ...Object.values(STATIC_PROMO_CODES).map(p => ({
      code: p.code,
      salesRep: p.salesRep,
      discountPercent: p.discountPercent,
    })),
    // Add a note about dynamic codes
    {
      code: "[INITIALS]S26",
      salesRep: "Dynamic - Rep Initials",
      discountPercent: 100,
    }
  ];
}
