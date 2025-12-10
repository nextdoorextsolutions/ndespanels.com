import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { PITCH_MULTIPLIERS } from '@/utils/roofingMath';
import type { RoofMeasurements, MeasurementType } from './types';
import { MEASUREMENT_TEXT_COLORS } from './constants';

interface MeasurementResultsProps {
  measurements: RoofMeasurements;
  selectedPitch: string;
  onPitchChange: (pitch: string) => void;
  onSave: () => void;
  onClearMeasurementType?: (type: MeasurementType) => void;
}

export function MeasurementResults({
  measurements,
  selectedPitch,
  onPitchChange,
  onSave,
  onClearMeasurementType,
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
              {(measurements.eaves || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.eaves}`}>Eaves:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{measurements.eaves} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('eaves')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear eaves measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {(measurements.rakes || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs font-semibold ${MEASUREMENT_TEXT_COLORS.rakes}`}>Rakes:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">{measurements.rakes} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('rakes')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear rakes measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {(measurements.valleys || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.valleys}`}>Valleys:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{measurements.valleys} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('valleys')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear valleys measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {(measurements.ridges || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.ridges}`}>Ridges:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{measurements.ridges} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('ridges')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear ridges measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {(measurements.hips || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.hips}`}>Hips:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{measurements.hips} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('hips')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear hips measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {(measurements.flashing || 0) > 0 && (
                <div className="flex justify-between items-center group">
                  <span className={`text-xs ${MEASUREMENT_TEXT_COLORS.flashing}`}>Flashing:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{measurements.flashing} LF</span>
                    {onClearMeasurementType && (
                      <button
                        onClick={() => onClearMeasurementType('flashing')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Clear flashing measurements"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
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
