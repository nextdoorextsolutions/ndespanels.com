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
  if (isDrawing) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Measurement Buttons */}
        <div className="lg:col-span-2">
          <p className="text-sm text-slate-300 mb-2 font-semibold">
            {activeTool ? `${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool active - Click on the map to draw` : 'Click to measure roof edges (in Linear Feet):'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {LINEAR_MEASUREMENT_TYPES.map((type) => (
              <Button
                key={type}
                onClick={() => onStartDrawing(type)}
                className={`${MEASUREMENT_BUTTON_STYLES[type]} text-white text-xs ${activeTool === type ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                size="sm"
              >
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
