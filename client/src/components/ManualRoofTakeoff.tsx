import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManualRoofTakeoffProps {
  latitude: number;
  longitude: number;
  onSave: (measurements: RoofMeasurements) => void;
  forceShow?: boolean; // Always show the component even if API data is available
}

interface RoofMeasurements {
  flatArea: number;
  totalArea: number;
  perimeter: number;
  pitch: string;
  pitchMultiplier: number;
  squares: number;
}

// Pitch multipliers for roof slope calculations
const PITCH_MULTIPLIERS: Record<string, number> = {
  'flat': 1.000,
  '2/12': 1.014,
  '3/12': 1.031,
  '4/12': 1.054,
  '5/12': 1.083,
  '6/12': 1.118,
  '7/12': 1.158,
  '8/12': 1.202,
  '9/12': 1.250,
  '10/12': 1.302,
  '11/12': 1.357,
  '12/12': 1.414,
};

const METERS_TO_SQFT = 10.764;
const METERS_TO_FEET = 3.28084;

export function ManualRoofTakeoff({ latitude, longitude, onSave, forceShow = false }: ManualRoofTakeoffProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState('4/12');
  const [measurements, setMeasurements] = useState<RoofMeasurements | null>(null);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.google) return;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 20,
      mapTypeId: 'satellite',
      tilt: 0,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapRef.current = map;

    // Initialize Drawing Manager
    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#FF0000',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#FF0000',
        editable: true,
        draggable: false,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Listen for polygon completion
    google.maps.event.addListener(drawingManager, 'overlaycomplete', (event: google.maps.drawing.OverlayCompleteEvent) => {
      if (event.type === 'polygon') {
        const newPolygon = event.overlay as google.maps.Polygon;
        
        // Remove previous polygon if exists
        if (polygon) {
          polygon.setMap(null);
        }
        
        setPolygon(newPolygon);
        calculateMeasurements(newPolygon);
        
        // Stop drawing mode after completing polygon
        drawingManager.setDrawingMode(null);
        setIsDrawing(false);

        // Listen for polygon edits
        google.maps.event.addListener(newPolygon.getPath(), 'set_at', () => {
          calculateMeasurements(newPolygon);
        });
        google.maps.event.addListener(newPolygon.getPath(), 'insert_at', () => {
          calculateMeasurements(newPolygon);
        });
      }
    });

    return () => {
      if (drawingManager) {
        google.maps.event.clearInstanceListeners(drawingManager);
        drawingManager.setMap(null);
      }
      if (polygon) {
        polygon.setMap(null);
      }
    };
  }, [latitude, longitude]);

  // Calculate measurements from polygon
  const calculateMeasurements = (poly: google.maps.Polygon) => {
    const path = poly.getPath();
    
    // Calculate flat area in square meters, then convert to square feet
    const areaMeters = google.maps.geometry.spherical.computeArea(path);
    const flatAreaSqFt = areaMeters * METERS_TO_SQFT;
    
    // Calculate perimeter in meters, then convert to feet
    const perimeterMeters = google.maps.geometry.spherical.computeLength(path);
    const perimeterFt = perimeterMeters * METERS_TO_FEET;
    
    // Apply pitch multiplier
    const pitchMultiplier = PITCH_MULTIPLIERS[selectedPitch] || 1.054;
    const totalAreaSqFt = flatAreaSqFt * pitchMultiplier;
    const squares = totalAreaSqFt / 100;
    
    const newMeasurements: RoofMeasurements = {
      flatArea: Math.round(flatAreaSqFt),
      totalArea: Math.round(totalAreaSqFt),
      perimeter: Math.round(perimeterFt),
      pitch: selectedPitch,
      pitchMultiplier,
      squares: Math.round(squares * 10) / 10, // Round to 1 decimal
    };
    
    setMeasurements(newMeasurements);
    toast.success('Measurements calculated!');
  };

  // Recalculate when pitch changes
  useEffect(() => {
    if (polygon) {
      calculateMeasurements(polygon);
    }
  }, [selectedPitch]);

  const handleStartDrawing = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      setIsDrawing(true);
      toast.info('Click on the map to draw the roof outline');
    }
  };

  const handleCancelDrawing = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
      setIsDrawing(false);
    }
  };

  const handleClearPolygon = () => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
      setMeasurements(null);
      toast.info('Polygon cleared');
    }
  };

  const handleSave = () => {
    if (measurements) {
      onSave(measurements);
      toast.success('Manual measurements saved!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-orange-400" />
              Manual Roof Takeoff
            </span>
            <div className="flex gap-2">
              {!isDrawing && !polygon && (
                <Button
                  onClick={handleStartDrawing}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Draw Roof Outline
                </Button>
              )}
              {isDrawing && (
                <Button
                  onClick={handleCancelDrawing}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              {polygon && (
                <Button
                  onClick={handleClearPolygon}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapContainerRef}
            className="w-full h-[500px] rounded-lg overflow-hidden"
          />
          {isDrawing && (
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Instructions:</strong> Click on the map to place points around the roof perimeter. 
                Double-click or click the first point again to complete the polygon.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pitch Selector and Results */}
      {polygon && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pitch Selector */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Roof Pitch</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPitch} onValueChange={setSelectedPitch}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.keys(PITCH_MULTIPLIERS).map((pitch) => (
                    <SelectItem key={pitch} value={pitch} className="text-white hover:bg-slate-700">
                      {pitch === 'flat' ? 'Flat' : pitch} (×{PITCH_MULTIPLIERS[pitch].toFixed(3)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-2">
                Pitch multiplier adjusts flat area to account for roof slope
              </p>
            </CardContent>
          </Card>

          {/* Measurements Display */}
          {measurements && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Calculated Measurements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Flat Area:</span>
                  <span className="text-white font-semibold">{measurements.flatArea.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pitch Adjustment:</span>
                  <span className="text-[#00d4aa] font-semibold">×{measurements.pitchMultiplier.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                  <span className="text-slate-400 font-semibold">Total Area:</span>
                  <span className="text-white font-bold text-lg">{measurements.totalArea.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Squares:</span>
                  <span className="text-[#00d4aa] font-bold text-lg">{measurements.squares}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                  <span className="text-slate-400">Perimeter:</span>
                  <span className="text-white font-semibold">{measurements.perimeter.toLocaleString()} ft</span>
                </div>
                
                <Button
                  onClick={handleSave}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Measurements to Job
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
