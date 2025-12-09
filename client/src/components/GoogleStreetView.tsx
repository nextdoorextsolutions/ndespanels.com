import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCw, MapPin, AlertCircle } from 'lucide-react';

interface GoogleStreetViewProps {
  latitude: number;
  longitude: number;
  heading?: number; // Initial heading in degrees (0-360)
  pitch?: number; // Initial pitch in degrees (-90 to 90)
  zoom?: number; // Initial zoom level (0-4)
}

export function GoogleStreetView({ 
  latitude, 
  longitude, 
  heading = 0, 
  pitch = 0, 
  zoom = 1 
}: GoogleStreetViewProps) {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const [panorama, setPanorama] = useState<google.maps.StreetViewPanorama | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [currentHeading, setCurrentHeading] = useState(heading);

  useEffect(() => {
    if (!panoramaRef.current || !window.google) return;

    const streetViewService = new google.maps.StreetViewService();
    const position = { lat: latitude, lng: longitude };

    // Check if Street View is available at this location
    streetViewService.getPanorama(
      { location: position, radius: 50 },
      (data, status) => {
        if (status === 'OK' && data) {
          setIsAvailable(true);
          
          // Initialize Street View panorama
          const panoOptions: google.maps.StreetViewPanoramaOptions = {
            position: data.location?.latLng || position,
            pov: {
              heading: heading,
              pitch: pitch,
            },
            zoom: zoom,
            addressControl: true,
            linksControl: true,
            panControl: true,
            enableCloseButton: false,
            fullscreenControl: true,
            motionTracking: false,
            motionTrackingControl: false,
          };

          const pano = new google.maps.StreetViewPanorama(
            panoramaRef.current!,
            panoOptions
          );

          setPanorama(pano);

          // Listen for POV changes to update heading
          pano.addListener('pov_changed', () => {
            const pov = pano.getPov();
            setCurrentHeading(Math.round(pov.heading));
          });
        } else {
          setIsAvailable(false);
          console.warn('[GoogleStreetView] Street View not available at this location');
        }
      }
    );

    return () => {
      if (panorama) {
        google.maps.event.clearInstanceListeners(panorama);
      }
    };
  }, [latitude, longitude]);

  const rotateView = (degrees: number) => {
    if (panorama) {
      const pov = panorama.getPov();
      panorama.setPov({
        heading: (pov.heading + degrees) % 360,
        pitch: pov.pitch,
      });
    }
  };

  const resetView = () => {
    if (panorama) {
      panorama.setPov({
        heading: heading,
        pitch: pitch,
      });
      panorama.setZoom(zoom);
    }
  };

  if (isAvailable === null) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-spin w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAvailable === false) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400" />
            Site Access View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[500px] bg-slate-900 rounded-lg">
            <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
            <p className="text-white text-lg font-semibold mb-2">Street View Not Available</p>
            <p className="text-slate-400 text-sm text-center max-w-md">
              Google Street View imagery is not available for this location. 
              This may be due to privacy restrictions or lack of coverage in this area.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Site Access View
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              Heading: {currentHeading}°
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Street View Container */}
        <div 
          ref={panoramaRef}
          className="w-full h-[500px] rounded-lg overflow-hidden"
        />

        {/* Control Panel */}
        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => rotateView(-90)}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <RotateCw className="w-4 h-4 mr-2 transform -scale-x-100" />
              Rotate Left
            </Button>
            <Button
              onClick={() => rotateView(90)}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Rotate Right
            </Button>
            <Button
              onClick={resetView}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Reset View
            </Button>
          </div>
          
          <div className="text-sm text-slate-400">
            <p className="font-semibold mb-1">Check for:</p>
            <ul className="text-xs space-y-1">
              <li>• Low hanging power lines</li>
              <li>• Narrow gates or driveways</li>
              <li>• Access restrictions</li>
              <li>• Parking availability</li>
            </ul>
          </div>
        </div>

        {/* Info Panel */}
        <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>Tip:</strong> Use your mouse or touch to look around. Click and drag to change the view direction. 
            Use the arrows in the view to move along the street.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
