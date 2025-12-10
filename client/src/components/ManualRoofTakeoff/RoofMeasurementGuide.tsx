import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function RoofMeasurementGuide() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Measurement Reference Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg p-2">
          <img 
            src="/images/roof-measurement-guide.png" 
            alt="Roof Measurement Guide showing color-coded roof components"
            className="w-full h-auto rounded"
          />
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
