// server/lib/solarApi.ts

// 1. Define the Solar API Response Types (Simplified for what we need)
interface SolarData {
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    wholeRoofStats: {
      areaMeters2: number;
      steepnessSummary: {
        cabinetSteepness: string;
        quantity: number;
      }[];
    };
    roofSegmentStats: {
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: {
        areaMeters2: number;
      };
      boundingBox: {
        sw: { latitude: number; longitude: number };
        ne: { latitude: number; longitude: number };
      };
    }[];
  };
}

// 2. Validation helper
export function hasValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  
  // Check if coordinates are within valid ranges
  // Latitude: -90 to 90, Longitude: -180 to 180
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

// 3. Fetch solar data using coordinates
export async function fetchSolarApiData(
  latitude: number,
  longitude: number
): Promise<{
  coverage: boolean;
  lat: number;
  lng: number;
  imageryUrl: string;
  solarPotential?: any;
  roofArea?: number;
  [key: string]: any;
}> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("[RoofAPI] Missing GOOGLE_MAPS_API_KEY - returning no coverage");
    const imageryUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=19&size=600x600&maptype=satellite`;
    return {
      coverage: false,
      lat: latitude,
      lng: longitude,
      imageryUrl,
      solarPotential: undefined,
      message: "Google Maps API key not configured",
    };
  }

  console.log(`[RoofAPI] Fetching data for coordinates: ${latitude}, ${longitude}`);
  console.log(`[RoofAPI] DEBUG - Latitude: ${latitude}, Longitude: ${longitude}`);
  console.log(`[RoofAPI] Using findClosest endpoint (no quality filter - accepting any quality level)`);

  try {
    const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const solarRes = await fetch(solarUrl);
    
    if (!solarRes.ok) {
      // Handle 404 (No coverage) specifically
      if (solarRes.status === 404) {
        console.log("[RoofAPI] No 3D roof coverage available for this location - returning fallback with satellite imagery");
        console.log(`[RoofAPI] DEBUG - 404 received for coordinates: ${latitude}, ${longitude}`);
        console.log(`[RoofAPI] DEBUG - Check if pin is on roof: https://www.google.com/maps?q=${latitude},${longitude}`);
        const imageryUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=19&size=600x600&maptype=satellite&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        return { 
          coverage: false, 
          lat: latitude, 
          lng: longitude,
          imageryUrl,
          solarPotential: undefined,
          message: "3D Roof Data Not Available"
        };
      }
      throw new Error(`Roof API Error: ${solarRes.statusText}`);
    }

    const solarData = await solarRes.json();
    
    console.log("[RoofAPI] Successfully fetched 3D roof data");
    
    // Return combined data
    return {
      coverage: true,
      lat: latitude,
      lng: longitude,
      imageryUrl: solarData.imageryUrl || `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=19&size=600x600&maptype=satellite&key=${process.env.GOOGLE_MAPS_API_KEY}`,
      ...solarData
    };
  } catch (error) {
    console.error("[RoofAPI] Error fetching roof data:", error);
    const imageryUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=19&size=600x600&maptype=satellite&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    return {
      coverage: false,
      lat: latitude,
      lng: longitude,
      imageryUrl,
      solarPotential: undefined,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "3D Roof Data Not Available"
    };
  }
}

// 4. Main Function to Fetch Data by Address (alternative method)
export async function getSolarData(address: string) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }

  // A. Geocode the address to get Lat/Lng
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  
  const geoRes = await fetch(geoUrl);
  const geoJson = await geoRes.json();

  if (!geoJson.results?.[0]?.geometry?.location) {
    throw new Error("Could not find coordinates for this address");
  }

  const { lat, lng } = geoJson.results[0].geometry.location;
  
  console.log(`[RoofAPI] Geocoded address "${address}" to coordinates:`);
  console.log(`[RoofAPI] DEBUG - Geocoded Latitude: ${lat}, Longitude: ${lng}`);
  console.log(`[RoofAPI] DEBUG - Verify location: https://www.google.com/maps?q=${lat},${lng}`);

  // B. Call Solar API using the fetched coordinates
  return await fetchSolarApiData(lat, lng);
}

// 5. Helper for Geometry Math (The one that was missing!)
export function calculateRoofMetrics(solarApiData: any) {
  if (!solarApiData || !solarApiData.solarPotential) {
    return {
      totalAreaSqFt: 0,
      predominantPitch: "N/A",
      eavesFt: 0,
      rakesFt: 0,
      ridgesFt: 0,
      valleysFt: 0
    };
  }

  // Basic conversion (Meters2 to SqFt)
  const METERS_TO_SQFT = 10.764;
  const totalArea = Math.round(
    solarApiData.solarPotential.wholeRoofStats.areaMeters2 * METERS_TO_SQFT
  );

  // *Placeholder* logic for linear measurements 
  // (You can ask Windsurf to improve this specific math later, 
  // but this stops the crash now).
  const segments = solarApiData.solarPotential.roofSegmentStats || [];
  
  // Rough estimation to prevent UI errors while you build the real math
  const estimatedPerimeter = Math.sqrt(totalArea) * 4; 
  
  return {
    totalAreaSqFt: totalArea,
    predominantPitch: "4/12", // Placeholder
    eavesFt: Math.round(estimatedPerimeter * 0.5),
    rakesFt: Math.round(estimatedPerimeter * 0.3),
    ridgesFt: Math.round(estimatedPerimeter * 0.2),
    valleysFt: 0
  };
}
