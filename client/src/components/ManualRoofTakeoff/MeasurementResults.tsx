import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { PITCH_MULTIPLIERS } from '@/utils/roofingMath';
import type { RoofMeasurements } from './types';
import { MEASUREMENT_TEXT_COLORS } from './constants';

interface MeasurementResultsProps {
  measurements: RoofMeasurements;
  selectedPitch: string;
  onPitchChange: (pitch: string) => void;
  onSave: () => void;
}

export function MeasurementResults({
  measurements,
  selectedPitch,
  onPitchChange,
  onSave,
}: MeasurementResultsProps) {
  const hasLinearMeasurements = 
    measurements.eaves || 
    measurements.rakes || 
    measurements.valleys || 
    measurements.ridges || 
    measurements.hips || 
    measurements.flashing;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Pitch Selector */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Roof Pitch</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPitch} onValueChange={onPitchChange}>
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
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Calculated Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Area Measurements */}
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
          
          {/* Linear Measurements */}
          {hasLinearMeasurements && (
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <p className="text-xs text-slate-400 font-semibold">Linear Measurements:</p>
              {measurements.eaves && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.eaves}`}>Eaves:</span>
                  <span className="text-white text-sm">{measurements.eaves} LF</span>
                </div>
              )}
              {measurements.rakes && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.rakes}`}>Rakes:</span>
                  <span className="text-white text-sm">{measurements.rakes} LF</span>
                </div>
              )}
              {measurements.valleys && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.valleys}`}>Valleys:</span>
                  <span className="text-white text-sm">{measurements.valleys} LF</span>
                </div>
              )}
              {measurements.ridges && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.ridges}`}>Ridges:</span>
                  <span className="text-white text-sm">{measurements.ridges} LF</span>
                </div>
              )}
              {measurements.hips && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.hips}`}>Hips:</span>
                  <span className="text-white text-sm">{measurements.hips} LF</span>
                </div>
              )}
              {measurements.flashing && (
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.flashing}`}>Flashing:</span>
                  <span className="text-white text-sm">{measurements.flashing} LF</span>
                </div>
              )}
            </div>
          )}
          
          <Button
            onClick={onSave}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Measurements to Job
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
