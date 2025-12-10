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
        <div className="bg-white rounded-lg p-4">
          <svg viewBox="0 0 1024 330" className="w-full h-auto">
            {/* Left Roof */}
            <g>
              {/* Base (Gables) - Blue */}
              <path d="M 40 280 L 40 180 L 100 180 L 100 280 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
              <path d="M 380 280 L 380 180 L 440 180 L 440 280 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
              
              {/* Roof surfaces - Dark gray */}
              <path d="M 100 180 L 260 60 L 380 180 Z" fill="#374151" stroke="#1F2937" strokeWidth="2"/>
              <path d="M 260 60 L 420 180 L 380 180 L 260 90 L 140 180 L 100 180 Z" fill="#4B5563" stroke="#1F2937" strokeWidth="2"/>
              
              {/* Gutters (Eaves) - Red */}
              <path d="M 100 180 L 380 180" stroke="#EF4444" strokeWidth="4" fill="none"/>
              <text x="240" y="200" fill="#EF4444" fontSize="12" fontWeight="bold" textAnchor="middle">RED</text>
              <text x="240" y="215" fill="#EF4444" fontSize="10" textAnchor="middle">(Gutters)</text>
              
              {/* Gables (Rakes) - Blue */}
              <path d="M 100 180 L 260 60" stroke="#3B82F6" strokeWidth="4" fill="none"/>
              <path d="M 380 180 L 260 60" stroke="#3B82F6" strokeWidth="4" fill="none"/>
              <text x="70" y="250" fill="#3B82F6" fontSize="12" fontWeight="bold">BLUE</text>
              <text x="70" y="265" fill="#3B82F6" fontSize="10">(Gables)</text>
              
              {/* Ridges - Yellow */}
              <path d="M 260 60 L 420 180" stroke="#EAB308" strokeWidth="4" fill="none"/>
              <text x="360" y="100" fill="#EAB308" fontSize="12" fontWeight="bold">YELLOW</text>
              <text x="360" y="115" fill="#EAB308" fontSize="10">(Ridges)</text>
              
              {/* Valley - Green */}
              <path d="M 260 90 L 260 180" stroke="#10B981" strokeWidth="4" fill="none"/>
              <text x="280" y="140" fill="#10B981" fontSize="12" fontWeight="bold">GREEN</text>
              <text x="280" y="155" fill="#10B981" fontSize="10">(Valley)</text>
              
              {/* Hips - Orange */}
              <path d="M 380 180 L 440 140" stroke="#F97316" strokeWidth="4" fill="none"/>
              <path d="M 100 180 L 40 140" stroke="#F97316" strokeWidth="4" fill="none"/>
              <text x="420" y="160" fill="#F97316" fontSize="12" fontWeight="bold">ORANGE</text>
              <text x="420" y="175" fill="#F97316" fontSize="10">(Hip)</text>
              
              {/* Flashing - Purple */}
              <rect x="200" y="100" width="30" height="35" fill="#D1D5DB" stroke="#6B7280" strokeWidth="2"/>
              <path d="M 200 100 L 215 85 L 230 100" fill="#D1D5DB" stroke="#6B7280" strokeWidth="2"/>
              <path d="M 200 100 L 230 100" stroke="#8B5CF6" strokeWidth="3" fill="none"/>
              <text x="180" y="75" fill="#8B5CF6" fontSize="12" fontWeight="bold">PURPLE</text>
              <text x="180" y="90" fill="#8B5CF6" fontSize="10">Flashing</text>
            </g>

            {/* Right Roof */}
            <g transform="translate(512, 0)">
              {/* Base (Gables) - Blue */}
              <path d="M 40 280 L 40 180 L 100 180 L 100 280 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
              <path d="M 380 280 L 380 180 L 440 180 L 440 280 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2"/>
              
              {/* Roof surfaces - Dark gray */}
              <path d="M 100 180 L 260 60 L 380 180 Z" fill="#374151" stroke="#1F2937" strokeWidth="2"/>
              <path d="M 260 60 L 420 180 L 380 180 L 260 90 L 140 180 L 100 180 Z" fill="#4B5563" stroke="#1F2937" strokeWidth="2"/>
              
              {/* Around (Perimeter) - Purple */}
              <path d="M 100 180 L 260 60 L 380 180 L 380 280 L 100 280 Z" stroke="#8B5CF6" strokeWidth="4" fill="none" strokeDasharray="8,4"/>
              <text x="240" y="40" fill="#8B5CF6" fontSize="12" fontWeight="bold" textAnchor="middle">PURPLE (Around)</text>
              
              {/* Gables - Blue */}
              <text x="420" y="240" fill="#3B82F6" fontSize="12" fontWeight="bold">BLUE</text>
              <text x="420" y="255" fill="#3B82F6" fontSize="10">(Gables)</text>
              
              {/* Hips - Orange */}
              <text x="450" y="100" fill="#F97316" fontSize="12" fontWeight="bold">ORANGE</text>
              <text x="450" y="115" fill="#F97316" fontSize="10">(Hips)</text>
              
              {/* Flashing - Purple */}
              <rect x="200" y="100" width="30" height="35" fill="#D1D5DB" stroke="#6B7280" strokeWidth="2"/>
              <path d="M 200 100 L 215 85 L 230 100" fill="#D1D5DB" stroke="#6B7280" strokeWidth="2"/>
              <text x="240" y="120" fill="#8B5CF6" fontSize="12" fontWeight="bold">PURPLE</text>
              <text x="240" y="135" fill="#8B5CF6" fontSize="10">Flashing</text>
            </g>
          </svg>
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
