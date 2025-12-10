// server/lib/materialConstants.ts
// Roofing Material Data Dictionary - Standard Beacon/QXO Coverage Rules

export interface MaterialCoverageRule {
  name: string;
  manufacturer?: string;
  productType: string;
  coverage: number; // Base coverage amount
  coverageUnit: string; // What the coverage represents
  packageUnit: string; // How it's sold (bundle, roll, piece, box)
  wasteFactor: {
    simple: number; // Simple gable roof
    moderate: number; // Hip roof
    complex: number; // Complex/cut-up roof
  };
  beaconSku?: string;
  notes?: string;
}

/**
 * MATERIAL COVERAGE RULES - DO NOT MODIFY WITHOUT CONSULTING SUPPLIER
 * These values are based on standard industry packaging from Beacon Building Products
 */
export const MATERIAL_DEFAULTS: Record<string, MaterialCoverageRule> = {
  // ==================== SHINGLES ====================
  ARCHITECTURAL_SHINGLES: {
    name: "Architectural Shingles (Standard)",
    productType: "shingle",
    coverage: 33.33, // sq ft per bundle (100 sq ft / 3 bundles)
    coverageUnit: "sq ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.07, // 7% waste for simple gable
      moderate: 1.12, // 12% waste for hip roof
      complex: 1.17, // 17% waste for complex roof
    },
    notes: "3 bundles = 1 square (100 sq ft). Always round UP to nearest whole bundle.",
  },

  THREE_TAB_SHINGLES: {
    name: "3-Tab Shingles",
    productType: "shingle",
    coverage: 33.33, // sq ft per bundle
    coverageUnit: "sq ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.10,
      complex: 1.15,
    },
    notes: "3 bundles = 1 square. Less waste than architectural due to simpler cuts.",
  },

  // ==================== STARTER STRIPS ====================
  STARTER_STRIP_STANDARD: {
    name: "Starter Strip (Standard)",
    productType: "starter",
    coverage: 100, // linear feet per bundle
    coverageUnit: "linear ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "Applied to eaves and rakes. 100 linear ft per bundle.",
  },

  STARTER_STRIP_GAF_PRO: {
    name: "GAF Pro-Start Starter Strip",
    manufacturer: "GAF",
    productType: "starter",
    coverage: 120, // linear feet per bundle
    coverageUnit: "linear ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "GAF Pro-Start covers 120 linear ft per bundle.",
  },

  // ==================== HIP & RIDGE CAPS ====================
  HIP_RIDGE_STANDARD: {
    name: "Hip & Ridge Cap (Standard 3-Tab Cut)",
    productType: "hip_ridge",
    coverage: 25, // linear feet per bundle
    coverageUnit: "linear ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "Standard 3-tab cut. 25 linear ft per bundle. Applied to ridges and hips.",
  },

  HIP_RIDGE_HIGH_PROFILE: {
    name: "Hip & Ridge Cap (High Profile/Deco)",
    productType: "hip_ridge",
    coverage: 20, // linear feet per bundle
    coverageUnit: "linear ft per bundle",
    packageUnit: "bundle",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "High profile decorative cap. 20 linear ft per bundle.",
  },

  // ==================== UNDERLAYMENT ====================
  SYNTHETIC_UNDERLAYMENT: {
    name: "Synthetic Underlayment",
    productType: "underlayment",
    coverage: 1000, // sq ft per roll (10 squares)
    coverageUnit: "sq ft per roll",
    packageUnit: "roll",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "10 squares (1,000 sq ft) per roll. Covers entire roof deck.",
  },

  FELT_UNDERLAYMENT_15LB: {
    name: "15lb Felt Underlayment",
    productType: "underlayment",
    coverage: 400, // sq ft per roll (4 squares)
    coverageUnit: "sq ft per roll",
    packageUnit: "roll",
    wasteFactor: {
      simple: 1.10,
      moderate: 1.15,
      complex: 1.20,
    },
    notes: "4 squares (400 sq ft) per roll. More waste due to overlaps.",
  },

  // ==================== SYNTHETIC UNDERLAYMENT (ICE & WATER) ====================
  SYNTHETIC_UNDERLAYMENT_ICE_WATER: {
    name: "Synthetic Underlayment",
    productType: "synthetic_underlayment",
    coverage: 200, // sq ft per roll (2 squares)
    coverageUnit: "sq ft per roll",
    packageUnit: "roll",
    wasteFactor: {
      simple: 1.10,
      moderate: 1.15,
      complex: 1.20,
    },
    notes: "2 squares (200 sq ft) per roll. Applied to valleys and eaves. Valley coverage: ~66 linear ft per roll (assuming 3 ft width).",
  },

  // ==================== DRIP EDGE ====================
  DRIP_EDGE: {
    name: "Drip Edge (Aluminum)",
    productType: "drip_edge",
    coverage: 10, // feet per piece
    coverageUnit: "ft per piece",
    packageUnit: "piece",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.08,
      complex: 1.10,
    },
    notes: "Sold in 10-foot sticks. Applied to entire perimeter (eaves + rakes).",
  },

  // ==================== VALLEY METAL ====================
  VALLEY_METAL: {
    name: "Valley Metal (W-Valley)",
    productType: "valley",
    coverage: 10, // feet per piece
    coverageUnit: "ft per piece",
    packageUnit: "piece",
    wasteFactor: {
      simple: 1.10,
      moderate: 1.15,
      complex: 1.20,
    },
    notes: "Sold in 10-foot pieces. Used for open valley installations.",
  },

  // ==================== NAILS ====================
  ROOFING_NAILS_COIL: {
    name: "Roofing Nails (Coil)",
    productType: "nails",
    coverage: 7200, // nails per box
    coverageUnit: "nails per box",
    packageUnit: "box",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.05,
      complex: 1.05,
    },
    notes: "7,200 count coil box. Standard: 320 nails/square (4-nail). Hurricane: 480 nails/square (6-nail).",
  },

  ROOFING_NAILS_HAND: {
    name: "Roofing Nails (Hand Drive)",
    productType: "nails",
    coverage: 5000, // nails per 50lb box (approximate)
    coverageUnit: "nails per box",
    packageUnit: "box (50lb)",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.05,
      complex: 1.05,
    },
    notes: "~5,000 nails per 50lb box. Standard: 320 nails/square.",
  },

  // ==================== ACCESSORIES ====================
  PIPE_BOOT: {
    name: "Pipe Boot (Standard)",
    productType: "accessory",
    coverage: 1,
    coverageUnit: "per piece",
    packageUnit: "piece",
    wasteFactor: {
      simple: 1.00,
      moderate: 1.00,
      complex: 1.00,
    },
    notes: "Count manually - cannot be detected from aerial imagery.",
  },

  ROOF_VENT: {
    name: "Roof Vent (Box/Turtle)",
    productType: "accessory",
    coverage: 1,
    coverageUnit: "per piece",
    packageUnit: "piece",
    wasteFactor: {
      simple: 1.00,
      moderate: 1.00,
      complex: 1.00,
    },
    notes: "Count manually based on attic ventilation requirements.",
  },

  RIDGE_VENT: {
    name: "Ridge Vent (Continuous)",
    productType: "accessory",
    coverage: 4, // feet per piece
    coverageUnit: "ft per piece",
    packageUnit: "piece",
    wasteFactor: {
      simple: 1.05,
      moderate: 1.05,
      complex: 1.05,
    },
    notes: "Sold in 4-foot sections. Measure total ridge length.",
  },
};

/**
 * Helper function to get material by key
 */
export function getMaterialRule(key: keyof typeof MATERIAL_DEFAULTS): MaterialCoverageRule {
  return MATERIAL_DEFAULTS[key];
}

/**
 * Helper function to calculate waste factor based on roof complexity
 */
export function getWasteFactor(
  materialKey: keyof typeof MATERIAL_DEFAULTS,
  roofComplexity: "simple" | "moderate" | "complex" = "moderate"
): number {
  const material = MATERIAL_DEFAULTS[materialKey];
  return material.wasteFactor[roofComplexity];
}

/**
 * Nail calculation helpers
 */
export const NAIL_PATTERNS = {
  STANDARD_4_NAIL: 320, // nails per square
  HURRICANE_6_NAIL: 480, // nails per square
  HIGH_WIND_8_NAIL: 640, // nails per square (extreme conditions)
};

/**
 * Calculate nails needed
 */
export function calculateNailsNeeded(
  totalSquares: number,
  pattern: keyof typeof NAIL_PATTERNS = "STANDARD_4_NAIL",
  wasteFactor: number = 1.05
): { totalNails: number; boxes: number } {
  const nailsPerSquare = NAIL_PATTERNS[pattern];
  const totalNails = Math.ceil(totalSquares * nailsPerSquare * wasteFactor);
  const nailsPerBox = MATERIAL_DEFAULTS.ROOFING_NAILS_COIL.coverage;
  const boxes = Math.ceil(totalNails / nailsPerBox);

  return { totalNails, boxes };
}
