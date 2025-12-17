import { Button } from '@/components/ui/button';
import type { MeasurementType } from './types';
import { MEASUREMENT_LABELS, MEASUREMENT_BUTTON_STYLES } from './constants';
import { RoofMeasurementGuide } from './RoofMeasurementGuide';

interface LinearMeasurementButtonsProps {
  onStartDrawing: (type: MeasurementType) => void;
  isDrawing: boolean;
  activeTool: MeasurementType | null;
}

const LINEAR_MEASUREMENT_TYPES: MeasurementType[] = [
  'eaves',
  'rakes',
  'valleys',
  'ridges',
  'hips',
  'flashing',
];

export function LinearMeasurementButtons({ onStartDrawing, isDrawing, activeTool }: LinearMeasurementButtonsProps) {
  // Don't hide buttons when drawing - keep them visible for tool switching
  // Only hide when drawing the main polygon (area)
  if (isDrawing && !activeTool) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Measurement Buttons */}
        <div className="lg:col-span-2">
          <p className="text-sm text-slate-300 mb-2 font-semibold">
            {activeTool ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-green-400">{activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool active</span>
                <span className="text-slate-400">- Click start point, then end point on the map</span>
              </span>
            ) : (
              'Click to measure roof edges (in Linear Feet):'
            )}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {LINEAR_MEASUREMENT_TYPES.map((type) => (
              <Button
                key={type}
                onClick={() => onStartDrawing(type)}
                className={`${MEASUREMENT_BUTTON_STYLES[type]} text-white text-xs transition-all ${
                  activeTool === type 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-105 shadow-lg' 
                    : 'hover:scale-105'
                }`}
                size="sm"
              >
                {activeTool === type && '✓ '}
                {MEASUREMENT_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>

        {/* Reference Guide */}
        <div className="lg:col-span-1">
          <RoofMeasurementGuide />
        </div>
      </div>
    </div>
  );
}
