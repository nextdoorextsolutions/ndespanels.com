import { useState, useRef, MouseEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function RoofMeasurementGuide() {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Keep magnifier within image bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setMagnifierPosition({ x, y });
      setShowMagnifier(true);
    } else {
      setShowMagnifier(false);
    }
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const magnifierSize = 150; // Size of the magnifying glass
  const zoomLevel = 2.5; // Magnification level

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Measurement Reference Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="bg-white rounded-lg p-2 overflow-hidden relative cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <img 
            ref={imgRef}
            src="https://mkmdffzjkttsklzsrdbv.supabase.co/storage/v1/object/public/Roof%20measurement%20diagram/roof-measurement-guide.png.jpg" 
            alt="Roof Measurement Guide showing color-coded roof components"
            loading="lazy"
            decoding="async"
            className="w-full h-auto rounded select-none"
            draggable={false}
          />
          
          {/* Magnifying Glass */}
          {showMagnifier && (
            <div
              className="absolute pointer-events-none border-4 border-slate-900 rounded-full shadow-2xl overflow-hidden"
              style={{
                width: `${magnifierSize}px`,
                height: `${magnifierSize}px`,
                left: `${magnifierPosition.x - magnifierSize / 2}px`,
                top: `${magnifierPosition.y - magnifierSize / 2}px`,
                backgroundImage: `url(https://mkmdffzjkttsklzsrdbv.supabase.co/storage/v1/object/public/Roof%20measurement%20diagram/roof-measurement-guide.png.jpg)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${(imgRef.current?.width || 0) * zoomLevel}px ${(imgRef.current?.height || 0) * zoomLevel}px`,
                backgroundPosition: `-${magnifierPosition.x * zoomLevel - magnifierSize / 2}px -${magnifierPosition.y * zoomLevel - magnifierSize / 2}px`,
              }}
            />
          )}
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Quick Reference:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
              <span><strong className="text-red-400">Red:</strong> Gutters (Eaves)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
              <span><strong className="text-blue-400">Blue:</strong> Gables (Rakes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
              <span><strong className="text-green-400">Green:</strong> Valleys</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-sm"></span>
              <span><strong className="text-yellow-400">Yellow:</strong> Ridges</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
              <span><strong className="text-orange-400">Orange:</strong> Hips</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
              <span><strong className="text-purple-400">Purple:</strong> Flashing</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
