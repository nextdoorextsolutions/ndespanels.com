// server/lib/materialCalculator.ts
import { MATERIAL_DEFAULTS, calculateNailsNeeded, NAIL_PATTERNS } from './materialConstants';

interface RoofMeasurements {
  totalArea: number; // Square feet
  perimeter: number; // Linear feet
  eaves: number; // Linear feet
  rakes: number; // Linear feet
  ridges: number; // Linear feet
  valleys: number; // Linear feet
  hips: number; // Linear feet
}

type RoofComplexity = "simple" | "moderate" | "complex";

interface MaterialKit {
  bundlesPerSquare?: number;
  wasteFactor?: number;
  starterCoverage?: number;
  hipRidgeCoverage?: number;
  roofComplexity?: RoofComplexity;
}

interface LineItem {
  productName: string;
  quantity: number;
  unit: string;
  beaconSku?: string;
  calculation?: string; // Show how it was calculated
}

export interface MaterialOrder {
  lineItems: LineItem[];
  totalSquares: number;
  summary: {
    shingleBundles: number;
    starterBundles: number;
    hipRidgeBundles: number;
    iceWaterRolls: number;
    underlaymentRolls: number;
    dripEdgePieces: number;
    valleyMetalPieces: number;
  };
}

/**
 * Calculate material requirements from roof measurements using industry-standard coverage rules
 */
export function calculateMaterialOrder(
  measurements: RoofMeasurements,
  materialKit: MaterialKit = {},
  accessories?: { name: string; quantity: number }[]
): MaterialOrder {
  const { totalArea, perimeter, eaves, rakes, ridges, valleys, hips } = measurements;
  
  // Determine roof complexity (default to moderate if not specified)
  const roofComplexity: RoofComplexity = materialKit.roofComplexity || "moderate";
  
  // Get material rules from constants
  const shingleRule = MATERIAL_DEFAULTS.ARCHITECTURAL_SHINGLES;
  const starterRule = MATERIAL_DEFAULTS.STARTER_STRIP_STANDARD;
  const hipRidgeRule = MATERIAL_DEFAULTS.HIP_RIDGE_STANDARD;
  const iceWaterRule = MATERIAL_DEFAULTS.ICE_WATER_SHIELD;
  const underlaymentRule = MATERIAL_DEFAULTS.SYNTHETIC_UNDERLAYMENT;
  const dripEdgeRule = MATERIAL_DEFAULTS.DRIP_EDGE;
  const valleyRule = MATERIAL_DEFAULTS.VALLEY_METAL;

  // Calculate squares (100 sq ft = 1 square)
  const squares = totalArea / 100;
  const shingleWaste = shingleRule.wasteFactor[roofComplexity];
  const squaresWithWaste = squares * shingleWaste;

  // 1. SHINGLES - 3 bundles per square, ALWAYS ROUND UP
  const bundlesPerSquare = 3; // Industry standard
  const shingleBundles = Math.ceil(squaresWithWaste * bundlesPerSquare);

  // 2. STARTER STRIP - 100 linear ft per bundle
  const starterWaste = starterRule.wasteFactor[roofComplexity];
  const starterLinearFt = (eaves + rakes) * starterWaste;
  const starterBundles = Math.ceil(starterLinearFt / starterRule.coverage);

  // 3. HIP & RIDGE CAP - 25 linear ft per bundle (standard 3-tab cut)
  const hipRidgeWaste = hipRidgeRule.wasteFactor[roofComplexity];
  const hipRidgeLinearFt = (ridges + hips) * hipRidgeWaste;
  const hipRidgeBundles = Math.ceil(hipRidgeLinearFt / hipRidgeRule.coverage);

  // 4. ICE & WATER SHIELD - 2 squares (200 sq ft) per roll
  // Valley coverage: ~66 linear ft per roll (assuming 3 ft width)
  const iceWaterWaste = iceWaterRule.wasteFactor[roofComplexity];
  const valleyAreaSqFt = valleys * 3 * iceWaterWaste; // 3 ft wide coverage
  const eaveAreaSqFt = eaves * 3 * iceWaterWaste; // 3 ft wide coverage on eaves
  const totalIceWaterArea = valleyAreaSqFt + eaveAreaSqFt;
  const iceWaterRolls = Math.ceil(totalIceWaterArea / iceWaterRule.coverage);

  // 5. UNDERLAYMENT - 10 squares (1,000 sq ft) per roll
  const underlaymentWaste = underlaymentRule.wasteFactor[roofComplexity];
  const underlaymentRolls = Math.ceil((squaresWithWaste * 100) / underlaymentRule.coverage);

  // 6. DRIP EDGE - 10 ft pieces
  const dripEdgeWaste = dripEdgeRule.wasteFactor[roofComplexity];
  const dripEdgeLinearFt = (eaves + rakes) * dripEdgeWaste;
  const dripEdgePieces = Math.ceil(dripEdgeLinearFt / dripEdgeRule.coverage);

  // 7. VALLEY METAL - 10 ft pieces (if open valleys)
  const valleyWaste = valleyRule.wasteFactor[roofComplexity];
  const valleyMetalPieces = valleys > 0 ? Math.ceil((valleys * valleyWaste) / valleyRule.coverage) : 0;

  // 8. NAILS - Calculate based on standard 4-nail pattern
  const nailCalc = calculateNailsNeeded(squaresWithWaste, "STANDARD_4_NAIL");
  const nailBoxes = nailCalc.boxes;

  // Build line items
  const lineItems: LineItem[] = [
    {
      productName: "Architectural Shingles",
      quantity: shingleBundles,
      unit: "bundles",
      calculation: `${squaresWithWaste.toFixed(1)} squares × ${bundlesPerSquare} bundles/sq`,
    },
    {
      productName: "Starter Strip Shingles",
      quantity: starterBundles,
      unit: "bundles",
      calculation: `${starterLinearFt.toFixed(0)} ft ÷ ${starterRule.coverage} ft/bundle`,
    },
    {
      productName: "Hip & Ridge Cap Shingles",
      quantity: hipRidgeBundles,
      unit: "bundles",
      calculation: `${hipRidgeLinearFt.toFixed(0)} ft ÷ ${hipRidgeRule.coverage} ft/bundle`,
    },
    {
      productName: "Ice & Water Shield",
      quantity: iceWaterRolls,
      unit: "rolls",
      calculation: `${totalIceWaterArea.toFixed(0)} sq ft ÷ ${iceWaterRule.coverage} sq ft/roll`,
    },
    {
      productName: "Synthetic Underlayment",
      quantity: underlaymentRolls,
      unit: "rolls",
      calculation: `${squaresWithWaste.toFixed(1)} squares ÷ 4 sq/roll`,
    },
    {
      productName: "Drip Edge",
      quantity: dripEdgePieces,
      unit: "pieces (10ft)",
      calculation: `${dripEdgeLinearFt.toFixed(0)} ft ÷ 10 ft/piece`,
    },
  ];

  // Add valley metal if needed
  if (valleyMetalPieces > 0) {
    lineItems.push({
      productName: "Valley Metal",
      quantity: valleyMetalPieces,
      unit: "pieces (10ft)",
      calculation: `${valleys.toFixed(0)} ft × ${valleyWaste.toFixed(2)} ÷ ${valleyRule.coverage} ft/piece`,
    });
  }

  // Add nails
  lineItems.push({
    productName: "Roofing Nails (Coil)",
    quantity: nailBoxes,
    unit: "boxes (7,200 count)",
    calculation: `${nailCalc.totalNails.toLocaleString()} nails needed (${NAIL_PATTERNS.STANDARD_4_NAIL} nails/sq)`,
  });

  // Add accessories if provided
  if (accessories && accessories.length > 0) {
    accessories.forEach((acc) => {
      lineItems.push({
        productName: acc.name,
        quantity: acc.quantity,
        unit: "pieces",
        calculation: "Manual entry",
      });
    });
  }

  return {
    lineItems,
    totalSquares: Math.round(squaresWithWaste * 10) / 10,
    summary: {
      shingleBundles,
      starterBundles,
      hipRidgeBundles,
      iceWaterRolls: iceWaterRolls,
      underlaymentRolls,
      dripEdgePieces,
      valleyMetalPieces,
    },
  };
}

/**
 * Generate CSV content for Beacon PRO+ upload
 */
export function generateBeaconCSV(lineItems: LineItem[]): string {
  const headers = ["Product Name", "Quantity", "Unit"];
  const rows = lineItems.map((item) => [
    item.productName,
    item.quantity.toString(),
    item.unit,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Generate order number (format: ORD-YYYYMMDD-XXXX)
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${dateStr}-${random}`;
}
