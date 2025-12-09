import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Get Google Maps API key from environment variable
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ Missing VITE_GOOGLE_MAPS_KEY environment variable in roofReportService');
}

// Company branding colors
const BRAND_BLUE = '#1e40af'; // Deep blue
const BRAND_ORANGE = '#ff6b35'; // Orange accent
const BRAND_CYAN = '#00d4aa'; // Cyan accent

interface BuildingInsights {
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    roofSegmentStats: Array<{
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: {
        areaMeters2: number;
      };
    }>;
  };
  center: {
    latitude: number;
    longitude: number;
  };
}

interface RoofData {
  totalAreaSqFt: number;
  predominantPitch: string;
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address to get latitude and longitude
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }
  
  const location = data.results[0].geometry.location;
  return { lat: location.lat, lng: location.lng };
}

/**
 * Fetch building insights from Google Solar API
 */
async function fetchBuildingInsights(lat: number, lng: number): Promise<BuildingInsights> {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Solar API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Convert pitch degrees to roof pitch notation (e.g., "8/12")
 */
function degreesToPitch(degrees: number): string {
  if (degrees === 0) return "0/12 (Flat)";
  
  // Convert degrees to rise/run ratio
  const radians = degrees * (Math.PI / 180);
  const rise = Math.tan(radians) * 12;
  
  return `${Math.round(rise)}/12`;
}

/**
 * Get roof data from Google Solar API
 */
export async function getRoofData(address: string): Promise<RoofData> {
  // Step 1: Geocode the address
  const { lat, lng } = await geocodeAddress(address);
  
  // Step 2: Fetch building insights
  const insights = await fetchBuildingInsights(lat, lng);
  
  // Step 3: Calculate total area and predominant pitch
  const roofSegments = insights.solarPotential.roofSegmentStats || [];
  
  let totalAreaMeters = 0;
  let pitchSum = 0;
  let segmentCount = 0;
  
  roofSegments.forEach(segment => {
    totalAreaMeters += segment.stats.areaMeters2;
    pitchSum += segment.pitchDegrees;
    segmentCount++;
  });
  
  const avgPitchDegrees = segmentCount > 0 ? pitchSum / segmentCount : 0;
  const totalAreaSqFt = totalAreaMeters * 10.764; // Convert m² to sq ft
  
  return {
    totalAreaSqFt: Math.round(totalAreaSqFt),
    predominantPitch: degreesToPitch(avgPitchDegrees),
    address,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Calculate waste factor table data
 */
function calculateWasteFactorTable(baseAreaSqFt: number) {
  const wasteFactors = [0, 10, 15, 20];
  
  return wasteFactors.map(wastePct => {
    const totalArea = baseAreaSqFt * (1 + wastePct / 100);
    const squares = totalArea / 100; // 1 square = 100 sq ft
    const bundles = Math.ceil(squares * 3); // Typically 3 bundles per square
    
    return {
      wastePct: `${wastePct}%`,
      totalArea: totalArea.toFixed(0),
      squares: squares.toFixed(2),
      bundles: bundles.toString(),
    };
  });
}

/**
 * Generate PDF report mimicking EagleView layout
 * @param address - Full address string
 * @param customerName - Customer name for the report
 * @param storedLat - Optional pre-geocoded latitude (skips geocoding step)
 * @param storedLng - Optional pre-geocoded longitude (skips geocoding step)
 * @returns Object with PDF blob and suggested filename
 */
export async function generateRoofReportPDF(
  address: string, 
  customerName: string,
  storedLat?: number,
  storedLng?: number
): Promise<{ blob: Blob; fileName: string }> {
  try {
    // Fetch roof data (use stored coordinates if available)
    let roofData: RoofData;
    
    if (storedLat !== undefined && storedLng !== undefined) {
      // Skip geocoding - use stored coordinates
      console.log('[Roof Report] Using stored coordinates:', storedLat, storedLng);
      const insights = await fetchBuildingInsights(storedLat, storedLng);
      
      const roofSegments = insights.solarPotential.roofSegmentStats || [];
      let totalAreaMeters = 0;
      let pitchSum = 0;
      let segmentCount = 0;
      
      roofSegments.forEach(segment => {
        totalAreaMeters += segment.stats.areaMeters2;
        pitchSum += segment.pitchDegrees;
        segmentCount++;
      });
      
      const avgPitchDegrees = segmentCount > 0 ? pitchSum / segmentCount : 0;
      const totalAreaSqFt = totalAreaMeters * 10.764;
      
      roofData = {
        totalAreaSqFt: Math.round(totalAreaSqFt),
        predominantPitch: degreesToPitch(avgPitchDegrees),
        address,
        latitude: storedLat,
        longitude: storedLng,
      };
    } else {
      // Geocode the address first
      console.log('[Roof Report] Geocoding address:', address);
      roofData = await getRoofData(address);
    }
    
    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ===== HEADER SECTION =====
    // Company logo placeholder (left side) - Using text since we'll use the actual logo
    doc.setFillColor(30, 64, 175); // Brand blue
    doc.rect(10, 10, 50, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('NDES', 35, 20, { align: 'center' });
    
    // Report title (right side)
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Production Report', pageWidth - 15, 15, { align: 'right' });
    
    // Date (right side, below title)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const today = new Date().toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    doc.text(today, pageWidth - 15, 22, { align: 'right' });
    
    // ===== ADDRESS BAR =====
    doc.setFillColor(30, 64, 175); // Brand blue
    doc.rect(10, 30, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(address, pageWidth / 2, 36, { align: 'center' });
    
    // ===== SATELLITE IMAGE SECTION =====
    const imageY = 45;
    const imageWidth = 90;
    const imageHeight = 70;
    
    // Get Google Static Map image
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${roofData.latitude},${roofData.longitude}&zoom=19&size=600x400&maptype=satellite&key=${GOOGLE_API_KEY}`;
    
    try {
      // Add the satellite image
      doc.addImage(staticMapUrl, 'JPEG', 10, imageY, imageWidth, imageHeight);
    } catch (error) {
      // If image fails, show placeholder
      doc.setFillColor(200, 200, 200);
      doc.rect(10, imageY, imageWidth, imageHeight, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text('Satellite Image', 55, imageY + 35, { align: 'center' });
    }
    
    // ===== MEASUREMENTS SECTION (Right side) =====
    const measurementsX = 105;
    const measurementsY = imageY;
    
    // Measurements header
    doc.setFillColor(200, 220, 240);
    doc.rect(measurementsX, measurementsY, pageWidth - measurementsX - 10, 10, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MEASUREMENTS', measurementsX + 2, measurementsY + 7);
    
    // Measurements content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let yPos = measurementsY + 15;
    const lineHeight = 6;
    
    const measurements = [
      { label: 'Total Roof Area', value: `${roofData.totalAreaSqFt.toLocaleString()} sq ft` },
      { label: 'Predominant Pitch', value: roofData.predominantPitch },
      { label: 'Squares', value: (roofData.totalAreaSqFt / 100).toFixed(2) },
    ];
    
    measurements.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.label} =`, measurementsX + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(item.value, measurementsX + 45, yPos);
      yPos += lineHeight;
    });
    
    // ===== WASTE FACTOR TABLE =====
    const tableY = imageY + imageHeight + 10;
    
    // Table header
    doc.setFillColor(200, 220, 240);
    doc.rect(10, tableY, pageWidth - 20, 10, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('WASTE FACTOR CALCULATIONS', 15, tableY + 7);
    
    // Generate table data
    const wasteTableData = calculateWasteFactorTable(roofData.totalAreaSqFt);
    
    // Create table using autoTable
    autoTable(doc, {
      startY: tableY + 12,
      head: [['Waste %', 'Total Area (sq ft)', 'Squares', 'Bundles']],
      body: wasteTableData.map(row => [
        row.wastePct,
        row.totalArea,
        row.squares,
        row.bundles,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175], // Brand blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 10, right: 10 },
    });
    
    // ===== PREPARED FOR SECTION =====
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(200, 220, 240);
    doc.rect(10, finalY, pageWidth - 20, 10, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PREPARED FOR', 15, finalY + 7);
    
    // Customer info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let customerY = finalY + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Contact:', 15, customerY);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, 50, customerY);
    customerY += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Address:', 15, customerY);
    doc.setFont('helvetica', 'normal');
    doc.text(address, 50, customerY);
    
    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Generated by Next Door Exterior Solutions - Powered by Google Solar API',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // ===== ACCENT LINE =====
    doc.setDrawColor(255, 107, 53); // Brand orange
    doc.setLineWidth(2);
    doc.line(10, 28, pageWidth - 10, 28);
    
    // Extract last name from customer name
    const nameParts = customerName.trim().split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    const fileName = `${lastName}_Roof_Report.pdf`;
    
    // Download to browser
    doc.save(fileName);
    
    // Also return blob for uploading to documents
    const pdfBlob = doc.output('blob');
    
    return { blob: pdfBlob, fileName };
    
  } catch (error) {
    console.error('Error generating roof report:', error);
    throw error;
  }
}
