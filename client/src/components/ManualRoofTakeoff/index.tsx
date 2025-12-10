import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PITCH_MULTIPLIERS, calculatePolylineLength, calculatePolygonArea, calculatePolygonPerimeter } from '@/utils/roofingMath';
import { LinearMeasurementButtons } from './LinearMeasurementButtons';
import { MeasurementResults } from './MeasurementResults';
import { MEASUREMENT_COLORS } from './constants';
import type { ManualRoofTakeoffProps, RoofMeasurements, MeasurementType, LinearMeasurement } from './types';

export function ManualRoofTakeoff({ latitude, longitude, onSave, forceShow = false }: ManualRoofTakeoffProps) {
  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState('4/12');
  const [measurements, setMeasurements] = useState<RoofMeasurements | null>(null);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
  const [measurementType, setMeasurementType] = useState<MeasurementType>('area');
  const [linearMeasurements, setLinearMeasurements] = useState<LinearMeasurement[]>([]);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  
  // Refs
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
      polylineOptions: {
        strokeWeight: 3,
        strokeColor: '#FF0000',
        editable: true,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    // Handle overlay completion
    google.maps.event.addListener(drawingManager, 'overlaycomplete', handleOverlayComplete);

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

  // Recalculate when pitch changes
  useEffect(() => {
    if (polygon) {
      calculateMeasurements(polygon);
    }
  }, [selectedPitch]);

  // Handle overlay completion (polygon or polyline)
  const handleOverlayComplete = (event: google.maps.drawing.OverlayCompleteEvent) => {
    if (event.type === 'polygon') {
      handlePolygonComplete(event.overlay as google.maps.Polygon);
    } else if (event.type === 'polyline') {
      handlePolylineComplete(event.overlay as google.maps.Polyline);
    }
  };

  // Handle polygon completion
  const handlePolygonComplete = (newPolygon: google.maps.Polygon) => {
    if (polygon) {
      polygon.setMap(null);
    }
    
    setPolygon(newPolygon);
    calculateMeasurements(newPolygon);
    
    drawingManagerRef.current?.setDrawingMode(null);
    setIsDrawing(false);

    // Listen for polygon edits
    google.maps.event.addListener(newPolygon.getPath(), 'set_at', () => calculateMeasurements(newPolygon));
    google.maps.event.addListener(newPolygon.getPath(), 'insert_at', () => calculateMeasurements(newPolygon));
  };

  // Handle polyline completion
  const handlePolylineComplete = (newPolyline: google.maps.Polyline) => {
    const length = calculatePolylineLength(newPolyline);
    
    const newMeasurement: LinearMeasurement = {
      type: measurementType,
      length,
      polyline: newPolyline,
    };
    
    const updatedMeasurements = [...linearMeasurements, newMeasurement];
    setLinearMeasurements(updatedMeasurements);
    updateLinearMeasurements(updatedMeasurements);
    
    drawingManagerRef.current?.setDrawingMode(null);
    setIsDrawing(false);
    
    toast.success(`${measurementType.charAt(0).toUpperCase() + measurementType.slice(1)}: ${Math.round(length)} ft`);
    
    // Listen for polyline edits
    const handlePolylineEdit = () => {
      const updatedLength = calculatePolylineLength(newPolyline);
      const updated = linearMeasurements.map(m => 
        m.polyline === newPolyline ? { ...m, length: updatedLength } : m
      );
      setLinearMeasurements(updated);
      updateLinearMeasurements(updated);
    };
    
    google.maps.event.addListener(newPolyline.getPath(), 'set_at', handlePolylineEdit);
    google.maps.event.addListener(newPolyline.getPath(), 'insert_at', handlePolylineEdit);
  };

  // Calculate measurements from polygon
  const calculateMeasurements = (poly: google.maps.Polygon) => {
    const flatAreaSqFt = calculatePolygonArea(poly);
    const perimeterFt = calculatePolygonPerimeter(poly);
    
    const pitchMultiplier = PITCH_MULTIPLIERS[selectedPitch] || 1.054;
    const totalAreaSqFt = flatAreaSqFt * pitchMultiplier;
    const squares = totalAreaSqFt / 100;
    
    const newMeasurements: RoofMeasurements = {
      flatArea: Math.round(flatAreaSqFt),
      totalArea: Math.round(totalAreaSqFt),
      perimeter: Math.round(perimeterFt),
      pitch: selectedPitch,
      pitchMultiplier,
      squares: Math.round(squares * 10) / 10,
    };
    
    setMeasurements(newMeasurements);
    toast.success('Measurements calculated!');
  };

  // Update linear measurements in the main measurements object
  const updateLinearMeasurements = (measurements: LinearMeasurement[]) => {
    const totals = measurements.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + m.length;
      return acc;
    }, {} as Record<string, number>);
    
    setMeasurements(prev => prev ? {
      ...prev,
      eaves: Math.round(totals.eaves || 0),
      rakes: Math.round(totals.rakes || 0),
      valleys: Math.round(totals.valleys || 0),
      ridges: Math.round(totals.ridges || 0),
      hips: Math.round(totals.hips || 0),
      flashing: Math.round(totals.flashing || 0),
    } : null);
  };

  // Start drawing (polygon or polyline)
  const handleStartDrawing = (type: MeasurementType = 'area') => {
    if (!drawingManagerRef.current) return;
    
    setMeasurementType(type);
    
    if (type === 'area') {
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      toast.info('Click on the map to draw the roof outline');
    } else {
      drawingManagerRef.current.setOptions({
        polylineOptions: {
          strokeWeight: 3,
          strokeColor: MEASUREMENT_COLORS[type],
          editable: true,
        },
      });
      
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
      toast.info(`Click on the map to measure ${type} (in linear feet)`);
    }
    
    setIsDrawing(true);
  };

  // Cancel drawing
  const handleCancelDrawing = () => {
    drawingManagerRef.current?.setDrawingMode(null);
    setIsDrawing(false);
  };

  // Clear polygon
  const handleClearPolygon = () => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
      setMeasurements(null);
      toast.info('Polygon cleared');
    }
  };

  // Clear linear measurements
  const handleClearLinearMeasurements = () => {
    linearMeasurements.forEach(m => m.polyline.setMap(null));
    setLinearMeasurements([]);
    setMeasurements(prev => prev ? {
      ...prev,
      eaves: 0,
      rakes: 0,
      valleys: 0,
      ridges: 0,
      hips: 0,
      flashing: 0,
    } : null);
    toast.info('All linear measurements cleared');
  };

  // Restart (clear everything)
  const handleRestart = () => {
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }
    
    linearMeasurements.forEach(m => m.polyline.setMap(null));
    setLinearMeasurements([]);
    setMeasurements(null);
    setIsDrawing(false);
    drawingManagerRef.current?.setDrawingMode(null);
    
    setShowRestartDialog(false);
    toast.success('All measurements cleared. Ready to start fresh!');
  };

  // Save measurements
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
                  onClick={() => handleStartDrawing('area')}
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
                <>
                  <Button
                    onClick={handleClearPolygon}
                    variant="outline"
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Area
                  </Button>
                  {linearMeasurements.length > 0 && (
                    <Button
                      onClick={handleClearLinearMeasurements}
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Lines
                    </Button>
                  )}
                  <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-red-900/20 border-red-600 text-red-400 hover:bg-red-900/40 hover:text-red-300"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restart
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-800 border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Clear All Measurements?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">
                          This will delete all your current measurements including the roof outline and all linear measurements (eaves, rakes, valleys, ridges, hips, and flashing). This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                          No, Keep Measurements
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRestart}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Yes, Clear Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
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
                <strong>Instructions:</strong> {measurementType === 'area' 
                  ? 'Click on the map to place points around the roof perimeter. Double-click or click the first point again to complete the polygon.'
                  : `Click on the map to draw a line for ${measurementType} measurement. Double-click to finish the line.`
                }
              </p>
            </div>
          )}
          
          {/* Linear Measurement Buttons */}
          {polygon && (
            <LinearMeasurementButtons 
              onStartDrawing={handleStartDrawing}
              isDrawing={isDrawing}
            />
          )}
        </CardContent>
      </Card>

      {/* Measurement Results */}
      {polygon && measurements && (
        <MeasurementResults
          measurements={measurements}
          selectedPitch={selectedPitch}
          onPitchChange={setSelectedPitch}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
