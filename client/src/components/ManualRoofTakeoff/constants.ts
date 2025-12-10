import type { MeasurementType } from './types';

export const MEASUREMENT_COLORS: Record<MeasurementType, string> = {
  area: '#FF0000',
  eaves: '#EF4444',
  rakes: '#60A5FA', // Brighter blue for better visibility
  valleys: '#10B981',
  ridges: '#EAB308',
  hips: '#F97316',
  flashing: '#8B5CF6',
};

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  area: 'Roof Area',
  eaves: 'Eaves (Gutters)',
  rakes: 'Rakes (Gables)',
  valleys: 'Valleys',
  ridges: 'Ridges',
  hips: 'Hips',
  flashing: 'Flashing',
};

export const MEASUREMENT_BUTTON_STYLES: Record<MeasurementType, string> = {
  area: 'bg-red-500 hover:bg-red-600',
  eaves: 'bg-red-500 hover:bg-red-600',
  rakes: 'bg-blue-500 hover:bg-blue-600',
  valleys: 'bg-green-500 hover:bg-green-600',
  ridges: 'bg-yellow-500 hover:bg-yellow-600',
  hips: 'bg-orange-500 hover:bg-orange-600',
  flashing: 'bg-purple-500 hover:bg-purple-600',
};

export const MEASUREMENT_TEXT_COLORS: Record<MeasurementType, string> = {
  area: 'text-red-400',
  eaves: 'text-red-400',
  rakes: 'text-blue-400',
  valleys: 'text-green-400',
  ridges: 'text-yellow-400',
  hips: 'text-orange-400',
  flashing: 'text-purple-400',
};
