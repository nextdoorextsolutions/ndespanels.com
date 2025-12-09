import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateRoofMetrics, calculateMaterialRequirements, formatLinearFeet, RoofMetrics, RoofSegment } from '@/utils/roofMath';
import { Download, Ruler, Home, ChevronUp, ChevronDown, Plus, Minus, MapPin } from 'lucide-react';
import { ManualRoofTakeoff } from './ManualRoofTakeoff';
import { GoogleStreetView } from './GoogleStreetView';
import { toast } from 'sonner';

interface RoofingReportViewProps {
  solarApiData: any;
  jobData: {
    fullName: string;
    address: string;
    cityStateZip: string;
  };
}

export function RoofingReportView({ solarApiData, jobData }: RoofingReportViewProps) {
  const [metrics, setMetrics] = useState<RoofMetrics | null>(null);
  const [wallFlashingAdder, setWallFlashingAdder] = useState<number>(0);
  const [wasteFactorPercent, setWasteFactorPercent] = useState<number>(10);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Manual drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [manualAreaSqFt, setManualAreaSqFt] = useState<number | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<google.maps.Polygon | null>(null);

  // Calculate metrics on mount
  useEffect(() => {
    if (solarApiData) {
      // Check if we have coverage (3D roof data available)
      if (solarApiData.coverage === false) {
        // No coverage - set empty metrics for manual entry
        setMetrics({
          totalArea: 0,
          predominantPitch: 0,
          perimeter: 0,
          segments: [],
          eaves: 0,
          rakes: 0,
          valleys: 0,
          ridges: 0,
          hips: 0
        });
      } else {
        const calculated = calculateRoofMetrics(solarApiData);
        setMetrics(calculated);
      }
    }
  }, [solarApiData]);

  // Draw satellite image with SVG overlay
  useEffect(() => {
    if (!metrics || !canvasRef.current || !solarApiData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get imagery URL from API response with fallback
    const imageryUrl = solarApiData.imageryUrl;
    if (!imageryUrl) {
      console.error('[RoofingReport] No imagery URL found in solarApiData:', solarApiData);
      console.error('[RoofingReport] This should not happen - check server/lib/solarApi.ts');
      // Construct fallback imagery URL if we have coordinates
      if (solarApiData.lat && solarApiData.lng) {
        console.warn('[RoofingReport] Using fallback satellite image from coordinates');
        const fallbackUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${solarApiData.lat},${solarApiData.lng}&zoom=19&size=600x600&maptype=satellite`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          setImageLoaded(true);
        };
        img.onerror = () => console.error('[RoofingReport] Fallback imagery also failed to load');
        img.src = fallbackUrl;
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw satellite image
      ctx.drawImage(img, 0, 0);

      // DISABLED: Automated roof segment overlays (causes visual issues)
      // Only draw roof segments if we have coverage (3D data available)
      // if (solarApiData.coverage !== false && metrics.segments.length > 0) {
      //   drawRoofSegments(ctx, metrics.segments, canvas.width, canvas.height);
      // }

      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('[RoofingReport] Failed to load imagery');
    };
    img.src = imageryUrl;
  }, [metrics, solarApiData]);

  const drawRoofSegments = (
    ctx: CanvasRenderingContext2D,
    segments: RoofSegment[],
    width: number,
    height: number
  ) => {
    // Get bounding box from solar data to map coordinates
    const buildingInsights = solarApiData.buildingInsights;
    if (!buildingInsights?.boundingBox) return;

    const bbox = buildingInsights.boundingBox;
    const sw = bbox.sw;
    const ne = bbox.ne;

    // Helper function to convert lat/lng to canvas coordinates
    const latLngToCanvas = (lng: number, lat: number): [number, number] => {
      const x = ((lng - sw.longitude) / (ne.longitude - sw.longitude)) * width;
      const y = height - ((lat - sw.latitude) / (ne.latitude - sw.latitude)) * height;
      return [x, y];
    };

    // Color mapping for edge types
    const colorMap: Record<RoofSegment['type'], string> = {
      eave: '#EF4444', // Red
      rake: '#3B82F6', // Blue
      valley: '#10B981', // Green
      ridge: '#F59E0B', // Yellow/Orange
      hip: '#F59E0B', // Yellow/Orange
    };

    // Draw each segment
    segments.forEach((segment) => {
      if (segment.coordinates.length < 2) return;

      const [start, end] = segment.coordinates;
      const [x1, y1] = latLngToCanvas(start[0], start[1]);
      const [x2, y2] = latLngToCanvas(end[0], end[1]);

      // Draw line
      ctx.strokeStyle = colorMap[segment.type];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw label with length
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const label = formatLinearFeet(segment.length);

      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text outline
      ctx.strokeText(label, midX, midY);
      // Draw text fill
      ctx.fillText(label, midX, midY);
    });
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    console.log('[RoofingReport] Download PDF clicked');
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
      </div>
    );
  }

  const materials = calculateMaterialRequirements(metrics, wasteFactorPercent);

  return (
    <div className="space-y-6 bg-slate-900 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Production Measurement Report</h1>
            <p className="text-blue-200 text-lg">{jobData.fullName}</p>
            <p className="text-blue-300 text-sm">{jobData.address}, {jobData.cityStateZip}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-blue-200">Report Date</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Section A: Tabbed View - Roof Visualization & Site Access */}
      <Tabs defaultValue="roof" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
          <TabsTrigger value="roof" className="data-[state=active]:bg-slate-700 text-white">
            <Home className="w-4 h-4 mr-2" />
            Roof Visualization
          </TabsTrigger>
          <TabsTrigger value="site-access" className="data-[state=active]:bg-slate-700 text-white">
            <MapPin className="w-4 h-4 mr-2" />
            Site Access
          </TabsTrigger>
        </TabsList>

        {/* Roof Visualization Tab */}
        <TabsContent value="roof" className="mt-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              {/* Show warning message if no 3D coverage */}
              {solarApiData?.coverage === false && (
                <div className="mb-4 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
                  <p className="text-orange-200 font-semibold">
                    ⚠️ {solarApiData?.manualMeasure ? 'Manual Measurements Required' : '3D Roof Data Not Available'}
                  </p>
                  <p className="text-orange-300 text-sm mt-1">
                    {solarApiData?.manualMeasure 
                      ? 'The Solar API does not have 3D coverage for this location. Use the satellite image below to perform manual roof measurements and enter values in the fields provided.'
                      : 'Automated measurements unavailable for this location. Please perform manual takeoff using the satellite image below.'}
                  </p>
                </div>
              )}
              <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* Manual Drawing Tool - Show when no 3D coverage */}
              {solarApiData?.coverage === false && solarApiData?.lat && solarApiData?.lng && (
                <div className="mt-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-[#00d4aa]" />
                    Manual Roof Measurement Tool
                  </h3>
                  <ManualRoofTakeoff
                    latitude={solarApiData.lat}
                    longitude={solarApiData.lng}
                    onSave={(measurements) => {
                      // Update the manual area when user saves drawing
                      setManualAreaSqFt(measurements.totalArea);
                      // Update metrics with manual measurements
                      setMetrics(prev => prev ? {
                        ...prev,
                        totalArea: measurements.totalArea,
                      } : null);
                      toast.success('Manual measurements saved!');
                    }}
                  />
                </div>
              )}

              {/* Legend - only show if we have 3D coverage */}
              {solarApiData?.coverage !== false && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-red-500"></div>
                    <span className="text-sm text-slate-300">Eaves (Gutters)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-blue-500"></div>
                    <span className="text-sm text-slate-300">Rakes (Gables)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-green-500"></div>
                    <span className="text-sm text-slate-300">Valleys</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-yellow-500"></div>
                    <span className="text-sm text-slate-300">Ridges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-orange-500"></div>
                    <span className="text-sm text-slate-300">Hips</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Access Tab with Google Street View */}
        <TabsContent value="site-access" className="mt-4">
          {solarApiData?.lat && solarApiData?.lng ? (
            <GoogleStreetView
              latitude={solarApiData.lat}
              longitude={solarApiData.lng}
              heading={0}
              pitch={0}
              zoom={1}
            />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-[500px] bg-slate-900 rounded-lg">
                  <p className="text-slate-400">No coordinates available for this location</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Roof Takeoff - Show when manual measurements are required */}
      {solarApiData?.manualMeasure && solarApiData?.lat && solarApiData?.lng && (
        <ManualRoofTakeoff
          latitude={solarApiData.lat}
          longitude={solarApiData.lng}
          onSave={(measurements) => {
            // Update metrics with manual measurements
            setMetrics({
              totalArea: measurements.totalArea,
              predominantPitch: parseInt(measurements.pitch.split('/')[0]) || 4,
              perimeter: measurements.perimeter,
              segments: [],
              eaves: Math.round(measurements.perimeter * 0.5),
              rakes: Math.round(measurements.perimeter * 0.3),
              valleys: 0,
              ridges: Math.round(measurements.perimeter * 0.2),
              hips: 0,
            });
          }}
        />
      )}

      {/* Roof Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Total Area</p>
              {solarApiData?.coverage === false ? (
                <Input
                  type="number"
                  placeholder="Enter sq ft"
                  className="text-center text-2xl font-bold bg-slate-700 border-slate-600 text-white w-32 mx-auto"
                  min="0"
                />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{Math.round(metrics.totalArea)} sq ft</p>
                  <p className="text-xs text-[#00d4aa] mt-1">{(metrics.totalArea / 100).toFixed(1)} squares</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Predominant Pitch</p>
              {solarApiData?.coverage === false ? (
                <Input
                  type="text"
                  placeholder="e.g., 4"
                  className="text-center text-2xl font-bold bg-slate-700 border-slate-600 text-white w-20 mx-auto"
                />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{metrics.predominantPitch}:12</p>
                  <p className="text-xs text-slate-500 mt-1">Rise : Run</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Total Perimeter</p>
              {solarApiData?.coverage === false ? (
                <Input
                  type="number"
                  placeholder="Enter ft"
                  className="text-center text-2xl font-bold bg-slate-700 border-slate-600 text-white w-32 mx-auto"
                  min="0"
                />
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{formatLinearFeet(metrics.perimeter)}</p>
                  <p className="text-xs text-slate-500 mt-1">Linear feet</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Waste Factor</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => setWasteFactorPercent(Math.max(0, wasteFactorPercent - 1))}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center">
                  <p className="text-2xl font-bold text-white">{wasteFactorPercent}</p>
                  <p className="text-xs text-slate-500">Percent</p>
                </div>
                <Button
                  onClick={() => setWasteFactorPercent(Math.min(50, wasteFactorPercent + 1))}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section B: Material Breakdown Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Ruler className="w-5 h-5 text-orange-400" />
            Material Order List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Component</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Source Measurement</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Raw Footage</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">With Waste ({wasteFactorPercent}%)</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">Starter Strip</td>
                  <td className="py-3 px-4 text-slate-300">{materials.starterStrip.source}</td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(materials.starterStrip.rawFootage)}</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{formatLinearFeet(materials.starterStrip.withWaste)}</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">{materials.starterStrip.unit}</td>
                </tr>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">Drip Edge</td>
                  <td className="py-3 px-4 text-slate-300">{materials.dripEdge.source}</td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(materials.dripEdge.rawFootage)}</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{formatLinearFeet(materials.dripEdge.withWaste)}</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">{materials.dripEdge.unit}</td>
                </tr>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">Hip & Ridge Cap</td>
                  <td className="py-3 px-4 text-slate-300">{materials.hipRidgeCap.source}</td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(materials.hipRidgeCap.rawFootage)}</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{formatLinearFeet(materials.hipRidgeCap.withWaste)}</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">{materials.hipRidgeCap.unit}</td>
                </tr>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">Valley Metal</td>
                  <td className="py-3 px-4 text-slate-300">{materials.valleyMetal.source}</td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(materials.valleyMetal.rawFootage)}</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{formatLinearFeet(materials.valleyMetal.withWaste)}</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">{materials.valleyMetal.unit}</td>
                </tr>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">Ice & Water Shield</td>
                  <td className="py-3 px-4 text-slate-300">{materials.iceWaterShield.source}</td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(materials.iceWaterShield.rawFootage)}</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{formatLinearFeet(materials.iceWaterShield.withWaste)}</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">{materials.iceWaterShield.unit}</td>
                </tr>
                <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 bg-blue-900/20">
                  <td className="py-3 px-4 text-white font-medium">Shingles</td>
                  <td className="py-3 px-4 text-slate-300">{materials.shingles.source}</td>
                  <td className="py-3 px-4 text-right text-white">{Math.round(materials.shingles.rawFootage)} sq ft</td>
                  <td className="py-3 px-4 text-right text-[#00d4aa] font-semibold">{materials.shingles.squares} squares</td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">100 sq ft/square</td>
                </tr>
                {/* Section C: Manual Override - Wall Flashing */}
                <tr className="border-b-2 border-orange-500/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-white font-medium">
                    Wall Flashing
                    <span className="text-xs text-orange-400 ml-2">(Manual)</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setWallFlashingAdder(Math.max(0, wallFlashingAdder - 5))}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={wallFlashingAdder}
                        onChange={(e) => setWallFlashingAdder(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="bg-slate-700 border-slate-600 text-white w-20 text-center"
                        min="0"
                      />
                      <Button
                        onClick={() => setWallFlashingAdder(wallFlashingAdder + 5)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-white">{formatLinearFeet(wallFlashingAdder)}</td>
                  <td className="py-3 px-4 text-right text-orange-400 font-semibold">
                    {formatLinearFeet(wallFlashingAdder * (1 + wasteFactorPercent / 100))}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 text-sm">linear feet</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Note */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> {solarApiData?.coverage === false 
                ? 'Manual measurements required. Enter all values in the fields above and in the table. '
                : `All measurements include a ${wasteFactorPercent}% waste factor. `}
              Wall flashing must be measured manually as it cannot be detected from aerial imagery.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
