import ExifParser from "exif-parser";

export interface PhotoMetadata {
  photoTakenAt: Date | null;
  latitude: string | null;
  longitude: string | null;
  cameraModel: string | null;
}

/**
 * Extract EXIF metadata from a photo buffer
 * Returns timestamp, GPS coordinates, and camera model if available
 */
export function extractExifMetadata(buffer: Buffer): PhotoMetadata {
  const result: PhotoMetadata = {
    photoTakenAt: null,
    latitude: null,
    longitude: null,
    cameraModel: null,
  };

  try {
    const parser = ExifParser.create(buffer);
    const exifData = parser.parse();
    
    // Extract date/time the photo was taken
    if (exifData.tags?.DateTimeOriginal) {
      // EXIF timestamps are in seconds since Unix epoch
      result.photoTakenAt = new Date(exifData.tags.DateTimeOriginal * 1000);
    } else if (exifData.tags?.CreateDate) {
      result.photoTakenAt = new Date(exifData.tags.CreateDate * 1000);
    } else if (exifData.tags?.ModifyDate) {
      result.photoTakenAt = new Date(exifData.tags.ModifyDate * 1000);
    }

    // Extract GPS coordinates
    if (exifData.tags?.GPSLatitude !== undefined && exifData.tags?.GPSLongitude !== undefined) {
      result.latitude = exifData.tags.GPSLatitude.toFixed(6);
      result.longitude = exifData.tags.GPSLongitude.toFixed(6);
    }

    // Extract camera/device model
    if (exifData.tags?.Model) {
      result.cameraModel = exifData.tags.Model;
    } else if (exifData.tags?.Make) {
      result.cameraModel = exifData.tags.Make;
    }

  } catch (error) {
    // EXIF parsing failed - return empty metadata
    // This is expected for non-JPEG files or photos without EXIF data
    console.log("EXIF extraction skipped:", error instanceof Error ? error.message : "Unknown error");
  }

  return result;
}

/**
 * Format GPS coordinates for display
 */
export function formatGpsCoordinates(lat: string | null, lng: string | null): string | null {
  if (!lat || !lng) return null;
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  const latDir = latNum >= 0 ? "N" : "S";
  const lngDir = lngNum >= 0 ? "E" : "W";
  
  return `${Math.abs(latNum).toFixed(4)}° ${latDir}, ${Math.abs(lngNum).toFixed(4)}° ${lngDir}`;
}

/**
 * Generate Google Maps URL from coordinates
 */
export function getGoogleMapsUrl(lat: string | null, lng: string | null): string | null {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
