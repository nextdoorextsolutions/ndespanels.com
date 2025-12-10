export interface RoofMeasurements {
  flatArea: number;
  totalArea: number;
  perimeter: number;
  pitch: string;
  pitchMultiplier: number;
  squares: number;
  eaves?: number;
  rakes?: number;
  valleys?: number;
  ridges?: number;
  hips?: number;
  flashing?: number;
}

export type MeasurementType = 'area' | 'eaves' | 'rakes' | 'valleys' | 'ridges' | 'hips' | 'flashing';

export interface LinearMeasurement {
  type: MeasurementType;
  length: number;
  polyline: google.maps.Polyline;
}

export interface ManualRoofTakeoffProps {
  latitude: number;
  longitude: number;
  onSave: (measurements: RoofMeasurements) => void;
  forceShow?: boolean;
}
