import { Button } from '@/components/ui/button';
import type { MeasurementType } from './types';
import { MEASUREMENT_LABELS, MEASUREMENT_BUTTON_STYLES } from './constants';

interface LinearMeasurementButtonsProps {
  onStartDrawing: (type: MeasurementType) => void;
  isDrawing: boolean;
}

const LINEAR_MEASUREMENT_TYPES: MeasurementType[] = [
  'eaves',
  'rakes',
  'valleys',
  'ridges',
  'hips',
  'flashing',
];

export function LinearMeasurementButtons({ onStartDrawing, isDrawing }: LinearMeasurementButtonsProps) {
  if (isDrawing) return null;

  return (
    <div className="mt-4">
      <p className="text-sm text-slate-300 mb-2 font-semibold">
        Click to measure roof edges (in Linear Feet):
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {LINEAR_MEASUREMENT_TYPES.map((type) => (
          <Button
            key={type}
            onClick={() => onStartDrawing(type)}
            className={`${MEASUREMENT_BUTTON_STYLES[type]} text-white text-xs`}
            size="sm"
          >
            {MEASUREMENT_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
