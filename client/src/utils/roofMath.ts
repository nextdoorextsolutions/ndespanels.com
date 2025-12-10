import * as turf from '@turf/turf';

export interface RoofSegment {
  type: 'eave' | 'rake' | 'ridge' | 'valley' | 'hip';
  length: number; // in feet
  coordinates: [number, number][];
  azimuth?: number;
  pitch?: number;
}

export interface RoofMetrics {
  totalArea: number; // square feet
  predominantPitch: number; // e.g., 6 (for 6:12)
  perimeter: number; // total perimeter in feet
  eaves: number; // total eave length in feet
  rakes: number; // total rake length in feet
  ridges: number; // total ridge length in feet
  valleys: number; // total valley length in feet
  hips: number; // total hip length in feet
  segments: RoofSegment[];
}

/**
 * Calculate roof metrics from Google Solar API data
 * @param solarApiData - Raw data from Google Solar API
 * @returns RoofMetrics object with all measurements
 */
export function calculateRoofMetrics(solarApiData: any): RoofMetrics {
  console.log('[RoofMath] Processing Solar API data:', solarApiData);

  // Initialize metrics
  const metrics: RoofMetrics = {
    totalArea: 0,
    predominantPitch: 0,
    perimeter: 0,
    eaves: 0,
    rakes: 0,
    ridges: 0,
    valleys: 0,
    hips: 0,
    segments: [],
  };

  try {
    // Extract building insights - handle both nested and direct solarPotential
    const buildingInsights = solarApiData.buildingInsights || solarApiData;
    if (!buildingInsights || !buildingInsights.solarPotential) {
      console.error('[RoofMath] No building insights or solar potential found');
      console.log('[RoofMath] Available keys:', Object.keys(solarApiData));
      
      // If we have totalArea directly, use it
      if (solarApiData.totalArea) {
        metrics.totalArea = solarApiData.totalArea;
        console.log('[RoofMath] Using direct totalArea:', metrics.totalArea);
      }
      
      // Estimate linear measurements if we have area
      if (metrics.totalArea > 0) {
        const estimatedPerimeter = Math.sqrt(metrics.totalArea) * 4;
        metrics.perimeter = Math.round(estimatedPerimeter);
        metrics.eaves = Math.round(estimatedPerimeter * 0.5);
        metrics.rakes = Math.round(estimatedPerimeter * 0.3);
        metrics.ridges = Math.round(estimatedPerimeter * 0.2);
        console.log('[RoofMath] Estimated linear measurements from area');
      }
      
      return metrics;
    }

    // Get total area from solar panels data
    const solarPotential = buildingInsights.solarPotential;
    if (solarPotential?.maxArrayAreaMeters2) {
      metrics.totalArea = solarPotential.maxArrayAreaMeters2 * 10.764; // Convert m² to ft²
    }

    // Get roof segments
    const roofSegmentStats = buildingInsights.solarPotential?.roofSegmentStats || [];
    
    // Calculate predominant pitch from roof segments
    if (roofSegmentStats.length > 0) {
      const pitches = roofSegmentStats
        .map((seg: any) => seg.pitchDegrees || 0)
        .filter((p: number) => p > 0);
      
      if (pitches.length > 0) {
        const avgPitchDegrees = pitches.reduce((a: number, b: number) => a + b, 0) / pitches.length;
        // Convert degrees to rise:run ratio (e.g., 6:12)
        metrics.predominantPitch = Math.round(Math.tan(avgPitchDegrees * Math.PI / 180) * 12);
      }
    }

    // Process roof segment boundaries to classify edges
    roofSegmentStats.forEach((segment: any, index: number) => {
      const boundingBox = segment.boundingBox;
      if (!boundingBox) return;

      const sw = boundingBox.sw;
      const ne = boundingBox.ne;
      
      if (!sw || !ne) return;

      // Create polygon from bounding box
      const polygon = turf.polygon([[
        [sw.longitude, sw.latitude],
        [ne.longitude, sw.latitude],
        [ne.longitude, ne.latitude],
        [sw.longitude, ne.latitude],
        [sw.longitude, sw.latitude],
      ]]);

      // Calculate perimeter of this segment
      const segmentPerimeter = turf.length(polygon, { units: 'feet' });
      metrics.perimeter += segmentPerimeter;

      // Get segment properties
      const pitchDegrees = segment.pitchDegrees || 0;
      const azimuthDegrees = segment.azimuthDegrees || 0;

      // Classify edges based on pitch and azimuth
      // This is a simplified classification - in production, you'd need more sophisticated logic
      const coords = polygon.geometry.coordinates[0];
      
      for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];
        const line = turf.lineString([start, end]);
        const lineLength = turf.length(line, { units: 'feet' });

        // Calculate bearing of the line
        const bearing = turf.bearing(start, end);
        const normalizedBearing = (bearing + 360) % 360;

        // Classify based on bearing relative to roof azimuth
        const bearingDiff = Math.abs(normalizedBearing - azimuthDegrees);
        
        let segmentType: RoofSegment['type'];
        
        if (pitchDegrees < 5) {
          // Flat roof - all edges are eaves
          segmentType = 'eave';
          metrics.eaves += lineLength;
        } else if (bearingDiff < 30 || bearingDiff > 330) {
          // Line is parallel to slope direction - likely a rake
          segmentType = 'rake';
          metrics.rakes += lineLength;
        } else if (bearingDiff > 150 && bearingDiff < 210) {
          // Line is opposite to slope - likely an eave
          segmentType = 'eave';
          metrics.eaves += lineLength;
        } else if (bearingDiff > 60 && bearingDiff < 120) {
          // Line is perpendicular - could be ridge or valley
          // For now, classify as ridge (would need more data to determine valley)
          segmentType = 'ridge';
          metrics.ridges += lineLength;
        } else {
          // Default to hip
          segmentType = 'hip';
          metrics.hips += lineLength;
        }

        metrics.segments.push({
          type: segmentType,
          length: lineLength,
          coordinates: [start, end] as [number, number][],
          azimuth: azimuthDegrees,
          pitch: pitchDegrees,
        });
      }
    });

    console.log('[RoofMath] Calculated metrics:', metrics);
    return metrics;

  } catch (error) {
    console.error('[RoofMath] Error calculating metrics:', error);
    return metrics;
  }
}

/**
 * Calculate material requirements based on roof metrics
 * @param metrics - RoofMetrics object
 * @param wasteFactorPercent - Waste factor percentage (default 10%)
 * @returns Material requirements object
 */
export function calculateMaterialRequirements(
  metrics: RoofMetrics,
  wasteFactorPercent: number = 10
) {
  const wasteFactor = 1 + (wasteFactorPercent / 100);

  return {
    // Starter strip - runs along eaves
    starterStrip: {
      source: 'Total Eaves',
      rawFootage: metrics.eaves,
      withWaste: Math.ceil(metrics.eaves * wasteFactor),
      unit: 'linear feet',
    },
    // Drip edge - runs along eaves and rakes
    dripEdge: {
      source: 'Eaves + Rakes',
      rawFootage: metrics.eaves + metrics.rakes,
      withWaste: Math.ceil((metrics.eaves + metrics.rakes) * wasteFactor),
      unit: 'linear feet',
    },
    // Hip & ridge cap - runs along ridges and hips
    hipRidgeCap: {
      source: 'Ridges + Hips',
      rawFootage: metrics.ridges + metrics.hips,
      withWaste: Math.ceil((metrics.ridges + metrics.hips) * wasteFactor),
      unit: 'linear feet',
    },
    // Valley metal - runs along valleys
    valleyMetal: {
      source: 'Valleys',
      rawFootage: metrics.valleys,
      withWaste: Math.ceil(metrics.valleys * wasteFactor),
      unit: 'linear feet',
    },
    // Ice & water shield - typically 2x valley length + eaves
    iceWaterShield: {
      source: 'Valleys (2x) + Eaves',
      rawFootage: (metrics.valleys * 2) + metrics.eaves,
      withWaste: Math.ceil(((metrics.valleys * 2) + metrics.eaves) * wasteFactor),
      unit: 'linear feet',
    },
    // Shingles - based on total area
    shingles: {
      source: 'Total Roof Area',
      rawFootage: metrics.totalArea,
      withWaste: Math.ceil(metrics.totalArea * wasteFactor),
      unit: 'square feet',
      squares: Math.ceil((metrics.totalArea * wasteFactor) / 100), // 1 square = 100 sq ft
    },
  };
}

/**
 * Format linear footage for display
 * @param feet - Length in feet
 * @returns Formatted string (e.g., "12' 6\"")
 */
export function formatLinearFeet(feet: number): string {
  const wholeFeet = Math.floor(feet);
  const inches = Math.round((feet - wholeFeet) * 12);
  
  if (inches === 0) {
    return `${wholeFeet}'`;
  }
  return `${wholeFeet}' ${inches}"`;
}
