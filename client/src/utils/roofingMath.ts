/**
 * Roofing Math Utilities
 * 
 * Pure functions for roofing calculations.
 * All math logic is centralized here to prevent bugs and enable testing.
 * 
 * Key principles:
 * - All functions are pure (no side effects)
 * - All constants are defined once
 * - All conversions are explicit
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Conversion factor from square meters to square feet
 * 1 m² = 10.764 ft²
 * 
 * Source: International System of Units (SI)
 * This is the OFFICIAL conversion factor used throughout the application.
 */
export const METERS_TO_SQFT = 10.764;

/**
 * Conversion factor from meters to feet
 * 1 m = 3.28084 ft
 */
export const METERS_TO_FEET = 3.28084;

/**
 * Pitch multipliers for roof slope calculations
 * 
 * These multipliers account for the additional surface area created by roof pitch.
 * For example, a 6/12 pitch roof has 11.8% more surface area than a flat roof
 * of the same footprint.
 * 
 * Format: "rise/run" where run is always 12 inches
 * Example: "6/12" means 6 inches of rise for every 12 inches of horizontal run
 * 
 * Formula: multiplier = √(1 + (rise/12)²)
 */
export const PITCH_MULTIPLIERS: Record<string, number> = {
  'flat': 1.000,   // 0° - No slope
  '2/12': 1.014,   // 9.5° - Very low slope
  '3/12': 1.031,   // 14° - Low slope
  '4/12': 1.054,   // 18.4° - Low slope
  '5/12': 1.083,   // 22.6° - Medium slope
  '6/12': 1.118,   // 26.6° - Medium slope (most common residential)
  '7/12': 1.158,   // 30.3° - Medium-steep slope
  '8/12': 1.202,   // 33.7° - Steep slope
  '9/12': 1.250,   // 36.9° - Steep slope
  '10/12': 1.302,  // 39.8° - Very steep slope
  '11/12': 1.357,  // 42.5° - Very steep slope
  '12/12': 1.414,  // 45° - Extremely steep slope
};

/**
 * Standard waste factor percentages for roofing materials
 */
export const WASTE_FACTORS = {
  MINIMAL: 5,      // For simple roofs with few cuts
  STANDARD: 10,    // Most common - recommended default
  MODERATE: 15,    // For complex roofs with valleys
  HIGH: 20,        // For very complex roofs or inexperienced crews
} as const;

/**
 * Roofing square definition
 * 1 square = 100 square feet
 */
export const SQUARE_FEET_PER_SQUARE = 100;

/**
 * Typical bundles per square for 3-tab shingles
 */
export const BUNDLES_PER_SQUARE = 3;

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert square meters to square feet
 * 
 * @param squareMeters - Area in square meters
 * @returns Area in square feet
 * 
 * @example
 * convertMetersToFeet(1) // Returns 10.764
 * convertMetersToFeet(100) // Returns 1076.4
 */
export function convertSqMetersToSqFeet(squareMeters: number): number {
  return squareMeters * METERS_TO_SQFT;
}

/**
 * Convert meters to feet (linear measurement)
 * 
 * @param meters - Length in meters
 * @returns Length in feet
 * 
 * @example
 * convertMetersToFeet(1) // Returns 3.28084
 * convertMetersToFeet(10) // Returns 32.8084
 */
export function convertMetersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

/**
 * Convert square feet to roofing squares
 * 
 * @param squareFeet - Area in square feet
 * @returns Number of roofing squares (rounded up)
 * 
 * @example
 * convertSqFeetToSquares(250) // Returns 3 (2.5 rounds up)
 * convertSqFeetToSquares(1000) // Returns 10
 */
export function convertSqFeetToSquares(squareFeet: number): number {
  return Math.ceil(squareFeet / SQUARE_FEET_PER_SQUARE);
}

// ============================================================================
// PITCH CALCULATIONS
// ============================================================================

/**
 * Get pitch multiplier for a given pitch
 * 
 * @param pitch - Pitch in "rise/12" format (e.g., "6/12")
 * @returns Multiplier for calculating actual roof surface area
 * 
 * @example
 * getPitchMultiplier("6/12") // Returns 1.118
 * getPitchMultiplier("flat") // Returns 1.000
 */
export function getPitchMultiplier(pitch: string): number {
  return PITCH_MULTIPLIERS[pitch] || PITCH_MULTIPLIERS['6/12']; // Default to 6/12 if not found
}

/**
 * Calculate actual roof surface area from footprint area
 * 
 * @param footprintArea - Horizontal footprint area in square feet
 * @param pitch - Pitch in "rise/12" format
 * @returns Actual roof surface area in square feet
 * 
 * @example
 * calculateRoofSurfaceArea(1000, "6/12") // Returns 1118 (1000 * 1.118)
 * calculateRoofSurfaceArea(1000, "flat") // Returns 1000
 */
export function calculateRoofSurfaceArea(footprintArea: number, pitch: string): number {
  const multiplier = getPitchMultiplier(pitch);
  return footprintArea * multiplier;
}

/**
 * Convert pitch degrees to rise/run ratio
 * 
 * @param degrees - Pitch angle in degrees
 * @returns Rise value for a 12-inch run (e.g., 6 for 6/12 pitch)
 * 
 * @example
 * convertDegreesToPitch(26.6) // Returns approximately 6 (for 6/12 pitch)
 */
export function convertDegreesToPitch(degrees: number): number {
  return Math.round(Math.tan(degrees * Math.PI / 180) * 12);
}

// ============================================================================
// WASTE CALCULATIONS
// ============================================================================

/**
 * Apply waste factor to a measurement
 * 
 * @param measurement - Base measurement (area or linear feet)
 * @param wastePercent - Waste percentage (e.g., 10 for 10%)
 * @returns Measurement with waste factor applied
 * 
 * @example
 * applyWasteFactor(1000, 10) // Returns 1100 (1000 * 1.10)
 * applyWasteFactor(500, 15) // Returns 575 (500 * 1.15)
 */
export function applyWasteFactor(measurement: number, wastePercent: number): number {
  return measurement * (1 + wastePercent / 100);
}

/**
 * Calculate waste factor multiplier from percentage
 * 
 * @param wastePercent - Waste percentage (e.g., 10 for 10%)
 * @returns Multiplier (e.g., 1.10 for 10%)
 * 
 * @example
 * getWasteMultiplier(10) // Returns 1.10
 * getWasteMultiplier(15) // Returns 1.15
 */
export function getWasteMultiplier(wastePercent: number): number {
  return 1 + (wastePercent / 100);
}

/**
 * Calculate material requirements with waste factor
 * 
 * @param baseAmount - Base amount needed
 * @param wastePercent - Waste percentage
 * @returns Object with raw and adjusted amounts
 * 
 * @example
 * calculateWithWaste(1000, 10)
 * // Returns { raw: 1000, withWaste: 1100, wasteAmount: 100 }
 */
export function calculateWithWaste(baseAmount: number, wastePercent: number) {
  const withWaste = applyWasteFactor(baseAmount, wastePercent);
  return {
    raw: baseAmount,
    withWaste: Math.ceil(withWaste),
    wasteAmount: Math.ceil(withWaste - baseAmount),
  };
}

// ============================================================================
// MATERIAL CALCULATIONS
// ============================================================================

/**
 * Calculate number of shingle bundles needed
 * 
 * @param squareFeet - Total roof area in square feet
 * @param wastePercent - Waste percentage (default 10%)
 * @returns Number of bundles needed (rounded up)
 * 
 * @example
 * calculateShingleBundles(1000, 10) // Returns 33 bundles
 * // Calculation: 1000 * 1.10 = 1100 sq ft
 * //              1100 / 100 = 11 squares
 * //              11 * 3 = 33 bundles
 */
export function calculateShingleBundles(squareFeet: number, wastePercent: number = WASTE_FACTORS.STANDARD): number {
  const areaWithWaste = applyWasteFactor(squareFeet, wastePercent);
  const squares = areaWithWaste / SQUARE_FEET_PER_SQUARE;
  return Math.ceil(squares * BUNDLES_PER_SQUARE);
}

/**
 * Calculate roofing squares with waste
 * 
 * @param squareFeet - Total roof area in square feet
 * @param wastePercent - Waste percentage (default 10%)
 * @returns Number of squares (rounded up)
 * 
 * @example
 * calculateSquares(1000, 10) // Returns 11 squares
 */
export function calculateSquares(squareFeet: number, wastePercent: number = WASTE_FACTORS.STANDARD): number {
  const areaWithWaste = applyWasteFactor(squareFeet, wastePercent);
  return convertSqFeetToSquares(areaWithWaste);
}

// ============================================================================
// VALIDATION & HELPERS
// ============================================================================

/**
 * Validate that a pitch string is in the correct format
 * 
 * @param pitch - Pitch string to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * isValidPitch("6/12") // Returns true
 * isValidPitch("flat") // Returns true
 * isValidPitch("invalid") // Returns false
 */
export function isValidPitch(pitch: string): boolean {
  return pitch in PITCH_MULTIPLIERS;
}

/**
 * Get all available pitch options
 * 
 * @returns Array of pitch strings
 */
export function getAvailablePitches(): string[] {
  return Object.keys(PITCH_MULTIPLIERS);
}

/**
 * Round to specified decimal places
 * 
 * @param value - Number to round
 * @param decimals - Number of decimal places (default 2)
 * @returns Rounded number
 * 
 * @example
 * roundTo(10.7639, 2) // Returns 10.76
 * roundTo(10.7639, 1) // Returns 10.8
 */
export function roundTo(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

// ============================================================================
// UNIT TESTS (Console verification)
// ============================================================================

/**
 * Run basic unit tests to verify math functions
 * Call this in development to verify calculations
 */
export function runUnitTests() {
  console.group('🧪 Roofing Math Unit Tests');
  
  // Test 1: Meters to square feet conversion
  const test1 = convertSqMetersToSqFeet(1);
  console.assert(test1 === 10.764, `❌ convertSqMetersToSqFeet(1) should equal 10.764, got ${test1}`);
  console.log(`✅ convertSqMetersToSqFeet(1) = ${test1}`);
  
  // Test 2: Pitch multiplier
  const test2 = getPitchMultiplier('6/12');
  console.assert(test2 === 1.118, `❌ getPitchMultiplier('6/12') should equal 1.118, got ${test2}`);
  console.log(`✅ getPitchMultiplier('6/12') = ${test2}`);
  
  // Test 3: Waste factor
  const test3 = applyWasteFactor(1000, 10);
  console.assert(test3 === 1100, `❌ applyWasteFactor(1000, 10) should equal 1100, got ${test3}`);
  console.log(`✅ applyWasteFactor(1000, 10) = ${test3}`);
  
  // Test 4: Roof surface area calculation
  const test4 = calculateRoofSurfaceArea(1000, '6/12');
  console.assert(test4 === 1118, `❌ calculateRoofSurfaceArea(1000, '6/12') should equal 1118, got ${test4}`);
  console.log(`✅ calculateRoofSurfaceArea(1000, '6/12') = ${test4}`);
  
  // Test 5: Shingle bundles
  const test5 = calculateShingleBundles(1000, 10);
  console.assert(test5 === 33, `❌ calculateShingleBundles(1000, 10) should equal 33, got ${test5}`);
  console.log(`✅ calculateShingleBundles(1000, 10) = ${test5} bundles`);
  
  console.groupEnd();
  console.log('✅ All roofing math tests passed!');
}

// ============================================================================
// GOOGLE MAPS UTILITIES
// ============================================================================

/**
 * Calculate length of a Google Maps polyline in feet
 * 
 * @param polyline - Google Maps Polyline object
 * @returns Length in feet
 */
export function calculatePolylineLength(polyline: google.maps.Polyline): number {
  const path = polyline.getPath();
  const lengthMeters = google.maps.geometry.spherical.computeLength(path);
  return convertMetersToFeet(lengthMeters);
}

/**
 * Calculate area of a Google Maps polygon in square feet
 * 
 * @param polygon - Google Maps Polygon object
 * @returns Area in square feet
 */
export function calculatePolygonArea(polygon: google.maps.Polygon): number {
  const path = polygon.getPath();
  const areaMeters = google.maps.geometry.spherical.computeArea(path);
  return convertSqMetersToSqFeet(areaMeters);
}

/**
 * Calculate perimeter of a Google Maps polygon in feet
 * 
 * @param polygon - Google Maps Polygon object
 * @returns Perimeter in feet
 */
export function calculatePolygonPerimeter(polygon: google.maps.Polygon): number {
  const path = polygon.getPath();
  const perimeterMeters = google.maps.geometry.spherical.computeLength(path);
  return convertMetersToFeet(perimeterMeters);
}

// Uncomment to run tests in development
// if (import.meta.env.DEV) {
//   runUnitTests();
// }
