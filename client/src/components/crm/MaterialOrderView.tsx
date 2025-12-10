import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialEmailDialog } from './MaterialEmailDialog';
import { useAuth } from '@/_core/hooks/useAuth';

interface MaterialOrderViewProps {
  jobId: number;
  jobAddress: string;
  roofArea: number; // Square feet
  perimeter?: number; // Linear feet
  ridgeLength?: number; // Linear feet
  hipLength?: number; // Linear feet
  valleyLength?: number; // Linear feet
}

// Common shingle systems
const SHINGLE_SYSTEMS = [
  'Tamko Titan XT',
  'Tamko Heritage',
  'Owens Corning Duration',
  'Owens Corning Oakridge',
  'GAF Timberline HDZ',
  'GAF Timberline HD',
  'CertainTeed Landmark',
  'CertainTeed XT 25',
  'IKO Cambridge',
  'Atlas StormMaster',
];

export function MaterialOrderView({
  jobId,
  jobAddress,
  roofArea,
  perimeter = 0,
  ridgeLength = 0,
  hipLength = 0,
  valleyLength = 0,
}: MaterialOrderViewProps) {
  // Top inputs
  const [shingleSystem, setShingleSystem] = useState('Tamko Titan XT');
  const [shingleColor, setShingleColor] = useState('');
  const [wastePercent, setWastePercent] = useState(12);

  // Manual accessories
  const [dripEdge, setDripEdge] = useState(0);
  const [pipeBoots, setPipeBoots] = useState(0);
  const [gooseNecks, setGooseNecks] = useState(0);
  const [sprayPaint, setSprayPaint] = useState(0);

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Auth for role check
  const { user } = useAuth();

  // Calculated quantities
  const [calculatedItems, setCalculatedItems] = useState({
    shingleBundles: 0,
    starterBundles: 0,
    hipBundles: 0,
    ridgeBundles: 0,
    underlaymentRolls: 0,
    syntheticUnderlaymentRolls: 0,
    nailBoxes: 0,
  });

  // Calculate quantities when inputs change
  useEffect(() => {
    const squares = roofArea / 100; // Convert sq ft to squares
    const areaWithWaste = roofArea * (1 + wastePercent / 100);
    const squaresWithWaste = areaWithWaste / 100;

    setCalculatedItems({
      // Shingles: 3 bundles per square, adjusted for waste
      shingleBundles: Math.ceil(squaresWithWaste * 3),
      
      // Starter: Perimeter in feet / 100 (each bundle covers ~100 LF)
      starterBundles: Math.ceil(perimeter / 100),
      
      // Hip: Hip length / 25 (each bundle covers ~25 LF)
      hipBundles: Math.ceil(hipLength / 25),
      
      // Ridge: Ridge length / 25 (each bundle covers ~25 LF)
      ridgeBundles: Math.ceil(ridgeLength / 25),
      
      // Underlayment: 1 roll per 10 squares (1000 sq ft)
      underlaymentRolls: Math.ceil(areaWithWaste / 1000),
      
      // Synthetic Underlayment: Valley length / 66 (each roll covers ~66 LF)
      syntheticUnderlaymentRolls: Math.ceil(valleyLength / 66),
      
      // Nails: 1 box per 20 squares
      nailBoxes: Math.ceil(squaresWithWaste / 20),
    });
  }, [roofArea, perimeter, ridgeLength, hipLength, valleyLength, wastePercent]);

  // Check if user has permission (Owner or Office only)
  const canOrderMaterials = user?.role === 'owner' || user?.role === 'office' || user?.role === 'admin';

  const handleOpenEmailDialog = () => {
    if (!shingleColor.trim()) {
      toast.error('Please enter a shingle color');
      return;
    }

    if (!canOrderMaterials) {
      toast.error('Only Owner and Office staff can draft material orders');
      return;
    }

    setEmailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Inputs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00d4aa]" />
            Material Order Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shingle System */}
            <div className="space-y-2">
              <Label className="text-slate-300">Shingle System *</Label>
              <Select value={shingleSystem} onValueChange={setShingleSystem}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {SHINGLE_SYSTEMS.map((system) => (
                    <SelectItem key={system} value={system} className="text-white hover:bg-slate-700">
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-slate-300">Shingle Color *</Label>
              <Input
                value={shingleColor}
                onChange={(e) => setShingleColor(e.target.value)}
                placeholder="e.g., Charcoal, Weathered Wood"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Waste % */}
            <div className="space-y-2">
              <Label className="text-slate-300">Waste Factor</Label>
              <Select value={wastePercent.toString()} onValueChange={(v) => setWastePercent(Number(v))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="7" className="text-white hover:bg-slate-700">7% (Simple)</SelectItem>
                  <SelectItem value="12" className="text-white hover:bg-slate-700">12% (Moderate)</SelectItem>
                  <SelectItem value="17" className="text-white hover:bg-slate-700">17% (Complex)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculated Grid */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Calculated Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left p-3 text-slate-300 text-sm">Material</th>
                  <th className="text-right p-3 text-slate-300 text-sm">Quantity</th>
                  <th className="text-right p-3 text-slate-300 text-sm">Unit</th>
                  <th className="text-left p-3 text-slate-300 text-sm">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Shingles</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.shingleBundles}</td>
                  <td className="p-3 text-right text-slate-400">BDL</td>
                  <td className="p-3 text-slate-300">{shingleSystem} - {shingleColor || '[Color]'}</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Starter Strip</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.starterBundles}</td>
                  <td className="p-3 text-right text-slate-400">BDL</td>
                  <td className="p-3 text-slate-300">Starter Strip Shingles</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Hip Cap</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.hipBundles}</td>
                  <td className="p-3 text-right text-slate-400">BDL</td>
                  <td className="p-3 text-slate-300">Hip Cap Shingles - {shingleColor || '[Color]'}</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Ridge Cap</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.ridgeBundles}</td>
                  <td className="p-3 text-right text-slate-400">BDL</td>
                  <td className="p-3 text-slate-300">Ridge Cap Shingles - {shingleColor || '[Color]'}</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Underlayment</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.underlaymentRolls}</td>
                  <td className="p-3 text-right text-slate-400">ROLL</td>
                  <td className="p-3 text-slate-300">Felt Underlayment (10 SQ/Roll)</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Synthetic Underlayment</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.syntheticUnderlaymentRolls}</td>
                  <td className="p-3 text-right text-slate-400">ROLL</td>
                  <td className="p-3 text-slate-300">Synthetic Underlayment (66 LF/Roll)</td>
                </tr>
                <tr className="border-t border-slate-700">
                  <td className="p-3 text-white">Roofing Nails</td>
                  <td className="p-3 text-right text-[#00d4aa] font-semibold">{calculatedItems.nailBoxes}</td>
                  <td className="p-3 text-right text-slate-400">BOX</td>
                  <td className="p-3 text-slate-300">1-1/4" Coil Roofing Nails (7,200 ct)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Accessories */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Manual Accessories</CardTitle>
          <p className="text-sm text-slate-400">Items not calculated automatically</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Drip Edge (10' pcs)</Label>
              <Input
                type="number"
                min="0"
                value={dripEdge}
                onChange={(e) => setDripEdge(Number(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Pipe Boots (Lead)</Label>
              <Input
                type="number"
                min="0"
                value={pipeBoots}
                onChange={(e) => setPipeBoots(Number(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Goose Necks (10" Galv)</Label>
              <Input
                type="number"
                min="0"
                value={gooseNecks}
                onChange={(e) => setGooseNecks(Number(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Spray Paint Cans</Label>
              <Input
                type="number"
                min="0"
                value={sprayPaint}
                onChange={(e) => setSprayPaint(Number(e.target.value))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button - Only for Owner and Office */}
      {canOrderMaterials ? (
        <div className="flex justify-end">
          <Button
            onClick={handleOpenEmailDialog}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-semibold"
          >
            <Mail className="w-4 h-4 mr-2" />
            Draft Supplier Order
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 p-4 bg-orange-900/20 border border-orange-500/50 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          <p className="text-orange-200">
            Only Owner and Office staff can draft material orders
          </p>
        </div>
      )}

      {/* Email Dialog */}
      <MaterialEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        jobAddress={jobAddress}
        roofArea={roofArea}
        perimeter={perimeter}
        ridgeLength={ridgeLength}
        shingleColor={shingleColor}
      />
    </div>
  );
}
