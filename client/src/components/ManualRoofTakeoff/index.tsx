import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PITCH_MULTIPLIERS, calculatePolylineLength, calculatePolygonArea, calculatePolygonPerimeter } from '@/utils/roofingMath';
import { LinearMeasurementButtons } from './LinearMeasurementButtons';
import { MeasurementResults } from './MeasurementResults';
import { MEASUREMENT_COLORS, MEASUREMENT_LABELS } from './constants';
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
  
  // Click-click-exit state
  const [activeTool, setActiveTool] = useState<MeasurementType | null>(null);
  const [tempLineStart, setTempLineStart] = useState<google.maps.LatLng | null>(null);
  const [tempLine, setTempLine] = useState<google.maps.Polyline | null>(null);
  const [mousePosition, setMousePosition] = useState<google.maps.LatLng | null>(null);
  
  // Snap-to-vertex state
  const [snapMarker, setSnapMarker] = useState<google.maps.Marker | null>(null);
  const [snappedVertex, setSnappedVertex] = useState<google.maps.LatLng | null>(null);
  
  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Map (only once on mount)
  useEffect(() => {
    if (!mapContainerRef.current || !window.google || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 21,
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
        fillOpacity: 0.15,
        strokeWeight: 2,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        editable: true,
        draggable: false,
        zIndex: 1,
      },
      polylineOptions: {
        strokeWeight: 3,
        strokeColor: '#FF0000',
        editable: true,
        zIndex: 10,
      },
    });

    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    return () => {
      if (drawingManagerRef.current) {
        google.maps.event.clearInstanceListeners(drawingManagerRef.current);
        drawingManagerRef.current.setMap(null);
      }
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount
  
  // Update map center when coordinates change
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.setCenter({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);
  
  // Attach event listeners separately (so they can access current state)
  useEffect(() => {
    if (!mapRef.current || !drawingManagerRef.current) return;
    
    const map = mapRef.current;
    const drawingManager = drawingManagerRef.current;
    
    // Handle overlay completion
    const overlayListener = google.maps.event.addListener(drawingManager, 'overlaycomplete', handleOverlayComplete);
    
    // Add click listener for click-click-exit drawing
    const clickListener = google.maps.event.addListener(map, 'click', handleMapClick);
    
    // Add mousemove listener for temporary line preview
    const mouseMoveListener = google.maps.event.addListener(map, 'mousemove', handleMapMouseMove);

    return () => {
      google.maps.event.removeListener(overlayListener);
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(mouseMoveListener);
    };
  }); // No dependencies - reattach on every render to capture latest state

  // Recalculate when pitch changes
  useEffect(() => {
    if (polygon) {
      calculateMeasurements(polygon);
    }
  }, [selectedPitch]);

  // Add escape key and right-click handlers to cancel drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        handleCancelDrawing();
      }
    };

    const handleRightClick = (e: MouseEvent) => {
      if (isDrawing && mapContainerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        handleCancelDrawing();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleRightClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleRightClick);
    };
  }, [isDrawing]);

  // Handle overlay completion (polygon or polyline)
  const handleOverlayComplete = (event: google.maps.drawing.OverlayCompleteEvent) => {
    if (event.type === 'polygon') {
      handlePolygonComplete(event.overlay as google.maps.Polygon);
    } else if (event.type === 'polyline') {
      handlePolylineComplete(event.overlay as google.maps.Polyline);
    }
  };

  // Helper function to find nearest vertex for snapping (polygon + line endpoints)
  const findNearestVertex = (latLng: google.maps.LatLng): google.maps.LatLng | null => {
    if (!mapRef.current) return null;
    
    const projection = mapRef.current.getProjection();
    if (!projection) return null;
    
    const point = projection.fromLatLngToPoint(latLng);
    if (!point) return null;
    
    const zoom = mapRef.current.getZoom() || 21;
    const snapThreshold = 15 / Math.pow(2, zoom); // Increased to 15 pixels for better magnetic effect
    
    let nearestVertex: google.maps.LatLng | null = null;
    let minDistance = snapThreshold;
    
    // Check polygon vertices
    if (polygon) {
      const path = polygon.getPath();
      for (let i = 0; i < path.getLength(); i++) {
        const vertex = path.getAt(i);
        const vertexPoint = projection.fromLatLngToPoint(vertex);
        if (!vertexPoint) continue;
        
        const distance = Math.sqrt(
          Math.pow(point.x - vertexPoint.x, 2) + Math.pow(point.y - vertexPoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestVertex = vertex;
        }
      }
    }
    
    // Check existing line endpoints for magnetic snapping
    linearMeasurements.forEach(measurement => {
      const path = measurement.polyline.getPath();
      for (let i = 0; i < path.getLength(); i++) {
        const vertex = path.getAt(i);
        const vertexPoint = projection.fromLatLngToPoint(vertex);
        if (!vertexPoint) continue;
        
        const distance = Math.sqrt(
          Math.pow(point.x - vertexPoint.x, 2) + Math.pow(point.y - vertexPoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestVertex = vertex;
        }
      }
    });
    
    return nearestVertex;
  };

  // Handle polygon completion
  const handlePolygonComplete = (newPolygon: google.maps.Polygon) => {
    if (polygon) {
      polygon.setMap(null);
    }
    
    // Set polygon options for better visibility
    newPolygon.setOptions({
      fillOpacity: 0.15,
      strokeOpacity: 0.8,
      zIndex: 1,
      clickable: false, // Prevent blocking clicks when drawing lines
    });
    
    setPolygon(newPolygon);
    calculateMeasurements(newPolygon);
    
    // Reset drawing mode and state
    drawingManagerRef.current?.setDrawingMode(null);
    setIsDrawing(false);
    
    toast.success('Roof outline completed!');

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

  // Handle map click for click-click-exit drawing
  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !activeTool || activeTool === 'area') return;
    
    // Use snapped vertex if available, otherwise use click position
    const clickPosition = snappedVertex || event.latLng;
    
    if (!tempLineStart) {
      // First click: set start point
      setTempLineStart(clickPosition);
      toast.info(`Click the end point for ${activeTool}`);
    } else {
      // Second click: create line and reset
      const path = [tempLineStart, clickPosition];
      
      const newPolyline = new google.maps.Polyline({
        path,
        strokeWeight: activeTool === 'rakes' ? 4 : 3, // Make rakes thicker for visibility
        strokeColor: MEASUREMENT_COLORS[activeTool],
        editable: true,
        map: mapRef.current,
        zIndex: 10, // Higher than polygon to allow overlapping
      });
      
      const length = calculatePolylineLength(newPolyline);
      
      const newMeasurement: LinearMeasurement = {
        type: activeTool,
        length,
        polyline: newPolyline,
      };
      
      const updatedMeasurements = [...linearMeasurements, newMeasurement];
      setLinearMeasurements(updatedMeasurements);
      updateLinearMeasurements(updatedMeasurements);
      
      toast.success(`${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}: ${Math.round(length)} ft`);
      
      // Listen for polyline edits
      const handlePolylineEdit = () => {
        const updatedLength = calculatePolylineLength(newPolyline);
        setLinearMeasurements(prev => prev.map(m => 
          m.polyline === newPolyline ? { ...m, length: updatedLength } : m
        ));
      };
      
      google.maps.event.addListener(newPolyline.getPath(), 'set_at', handlePolylineEdit);
      google.maps.event.addListener(newPolyline.getPath(), 'insert_at', handlePolylineEdit);
      
      // Auto-exit: reset tool
      setActiveTool(null);
      setTempLineStart(null);
      setMousePosition(null);
      
      // Clear temporary line
      if (tempLine) {
        tempLine.setMap(null);
        setTempLine(null);
      }
    }
  };
  
  // Handle mouse move for temporary line preview
  const handleMapMouseMove = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !activeTool || activeTool === 'area') return;
    
    // Check for nearby vertices to snap to
    const nearestVertex = findNearestVertex(event.latLng);
    const positionToUse = nearestVertex || event.latLng;
    
    // Update snapped vertex state
    if (nearestVertex) {
      setSnappedVertex(nearestVertex);
      
      // Show snap indicator
      if (!snapMarker) {
        const marker = new google.maps.Marker({
          position: nearestVertex,
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FFFF00',
            fillOpacity: 0.6,
            strokeColor: '#FFA500',
            strokeWeight: 2,
          },
          zIndex: 100,
          clickable: false,
        });
        setSnapMarker(marker);
      } else {
        snapMarker.setPosition(nearestVertex);
      }
    } else {
      setSnappedVertex(null);
      if (snapMarker) {
        snapMarker.setMap(null);
        setSnapMarker(null);
      }
    }
    
    // Only update temp line if we have a start point
    if (!tempLineStart) return;
    
    setMousePosition(positionToUse);
    
    // Update or create temporary line
    if (tempLine) {
      tempLine.setPath([tempLineStart, positionToUse]);
    } else {
      const newTempLine = new google.maps.Polyline({
        path: [tempLineStart, positionToUse],
        strokeWeight: 2,
        strokeColor: MEASUREMENT_COLORS[activeTool],
        strokeOpacity: 0.5,
        map: mapRef.current,
        clickable: false,
        zIndex: 9,
      });
      setTempLine(newTempLine);
    }
  };
  
  // Toggle tool selection
  const handleToolSelect = (type: MeasurementType) => {
    if (activeTool === type) {
      // Deselect if clicking the same tool
      setActiveTool(null);
      setTempLineStart(null);
      setMousePosition(null);
      setSnappedVertex(null);
      if (tempLine) {
        tempLine.setMap(null);
        setTempLine(null);
      }
      if (snapMarker) {
        snapMarker.setMap(null);
        setSnapMarker(null);
      }
      toast.info('Tool deselected');
    } else {
      // Select new tool
      setActiveTool(type);
      setTempLineStart(null);
      setMousePosition(null);
      setSnappedVertex(null);
      if (tempLine) {
        tempLine.setMap(null);
        setTempLine(null);
      }
      if (snapMarker) {
        snapMarker.setMap(null);
        setSnapMarker(null);
      }
      toast.info(`${type.charAt(0).toUpperCase() + type.slice(1)} tool selected. Click start point on the map.`);
    }
  };

  // Start drawing (polygon or polyline)
  const handleStartDrawing = (type: MeasurementType = 'area') => {
    if (!drawingManagerRef.current || !mapRef.current) return;
    
    setMeasurementType(type);
    
    if (type === 'area') {
      // Explicitly set drawing mode to POLYGON
      const drawingMode = google.maps.drawing.OverlayType.POLYGON;
      drawingManagerRef.current.setDrawingMode(drawingMode);
      
      // Force the map to recognize we're in drawing mode
      setIsDrawing(true);
      
      // Set map options to prevent dragging while drawing
      mapRef.current.setOptions({
        draggable: false,
        scrollwheel: true,
        disableDoubleClickZoom: true,
      });
      
      toast.info('Click on the map to draw the roof outline. Press ESC to cancel.');
    } else {
      // Use click-click-exit for linear measurements
      handleToolSelect(type);
    }
  };

  // Cancel drawing
  const handleCancelDrawing = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
    
    // Re-enable map dragging
    if (mapRef.current) {
      mapRef.current.setOptions({
        draggable: true,
        disableDoubleClickZoom: false,
      });
    }
    
    setIsDrawing(false);
    toast.info('Drawing cancelled');
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

  // Clear linear measurements by type
  const handleClearLinearMeasurementsByType = (type: MeasurementType) => {
    const toRemove = linearMeasurements.filter(m => m.type === type);
    toRemove.forEach(m => m.polyline.setMap(null));
    
    const remaining = linearMeasurements.filter(m => m.type !== type);
    setLinearMeasurements(remaining);
    
    // Recalculate totals
    const totals = remaining.reduce((acc, m) => {
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
    
    toast.info(`${MEASUREMENT_LABELS[type]} cleared`);
  };
  
  // Clear all linear measurements
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
            className={`w-full h-[500px] rounded-lg overflow-hidden ${isDrawing ? 'cursor-crosshair' : ''}`}
            style={isDrawing ? { cursor: 'crosshair !important' } as React.CSSProperties : undefined}
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
              activeTool={activeTool}
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
          onClearMeasurementType={handleClearLinearMeasurementsByType}
        />
      )}
    </div>
  );
}
