// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Download, Mail, FileDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface MaterialOrderBuilderProps {
  jobId: number;
  jobAddress: string;
}

// Common accessories that can't be seen from satellite
const COMMON_ACCESSORIES = [
  { name: 'Pipe Boots (Lead/3-in-1)', key: 'pipeBoots' },
  { name: 'Box Vents', key: 'boxVents' },
  { name: 'Goose Necks', key: 'gooseNecks' },
  { name: 'Chimney Flashing Kits', key: 'chimneyFlashing' },
  { name: 'Turbine Vents', key: 'turbineVents' },
  { name: 'Skylight Flashing', key: 'skylightFlashing' },
];

export function MaterialOrderBuilder({ jobId, jobAddress }: MaterialOrderBuilderProps) {
  // Section A: Settings
  const [shingleColor, setShingleColor] = useState('');
  const [shingleBrand, setShingleBrand] = useState('GAF Timberline HDZ');
  const [roofComplexity, setRoofComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate');
  
  // Section B: Accessories Board
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({
    pipeBoots: 0,
    boxVents: 0,
    gooseNecks: 0,
    chimneyFlashing: 0,
    turbineVents: 0,
    skylightFlashing: 0,
  });

  const { data: existingOrders, refetch } = trpc.crm.getMaterialOrders.useQuery({ jobId });
  const { data: latestOrder } = trpc.crm.getMaterialOrders.useQuery({ jobId }, {
    select: (data) => data[0], // Get most recent order
  });

  const generateOrder = trpc.crm.generateBeaconOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Order ${data.order.orderNumber} created successfully!`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateAccessory = (key: string, value: number) => {
    setAccessoryQuantities(prev => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  };

  const handleGenerateOrder = () => {
    if (!shingleColor.trim()) {
      toast.error('Please enter a shingle color');
      return;
    }

    // Convert accessories to array format
    const accessories = COMMON_ACCESSORIES
      .filter(acc => accessoryQuantities[acc.key] > 0)
      .map(acc => ({
        name: acc.name,
        quantity: accessoryQuantities[acc.key],
      }));

    generateOrder.mutate({
      jobId,
      shingleColor,
      materialSystem: shingleBrand.split(' ')[0], // Extract brand (GAF, OC, etc.)
      roofComplexity,
      accessories: accessories.length > 0 ? accessories : undefined,
    });
  };

  const handleDownloadCSV = (csvUrl: string) => {
    window.open(csvUrl, '_blank');
  };

  const handleSendToSupplier = (order: any) => {
    const subject = encodeURIComponent(`New Order: ${jobAddress}`);
    const body = encodeURIComponent(
      `Order Number: ${order.orderNumber}\n` +
      `Address: ${jobAddress}\n` +
      `Total Squares: ${order.totalSquares}\n\n` +
      `Please see attached CSV for complete order details.\n\n` +
      `CSV Download: ${order.csvUrl || 'Generating...'}`
    );
    const mailto = `mailto:sales@becn.com?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  return (
    <div className="space-y-6">
      {/* Order Builder Form */}
      {/* @ts-ignore - Card children type inference issue with jsonb fields */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
            Material Order Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section A: Settings */}
          <div>
            <h3 className="text-white font-semibold mb-3">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roofComplexity" className="text-slate-300">
                  Roof Complexity
                </Label>
                <Select value={roofComplexity} onValueChange={(v: any) => setRoofComplexity(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="simple" className="text-white hover:bg-slate-700">
                      Simple (7% waste)
                    </SelectItem>
                    <SelectItem value="moderate" className="text-white hover:bg-slate-700">
                      Moderate (12% waste)
                    </SelectItem>
                    <SelectItem value="complex" className="text-white hover:bg-slate-700">
                      Complex (17% waste)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shingleColor" className="text-slate-300">
                  Shingle Color *
                </Label>
                <Input
                  id="shingleColor"
                  value={shingleColor}
                  onChange={(e) => setShingleColor(e.target.value)}
                  placeholder="e.g., Charcoal, Weathered Wood"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shingleBrand" className="text-slate-300">
                  Shingle Brand
                </Label>
                <Input
                  id="shingleBrand"
                  value={shingleBrand}
                  onChange={(e) => setShingleBrand(e.target.value)}
                  placeholder="e.g., GAF Timberline HDZ"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Section B: Accessories Board */}
          <div>
            <h3 className="text-white font-semibold mb-2">Accessories Board</h3>
            <p className="text-xs text-slate-400 mb-3">
              Items that cannot be detected from satellite imagery
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COMMON_ACCESSORIES.map((accessory) => (
                <div key={accessory.key} className="bg-slate-700 p-3 rounded-lg space-y-2">
                  <Label className="text-slate-300 text-sm">{accessory.name}</Label>
                  <Input
                    type="number"
                    value={accessoryQuantities[accessory.key] ?? 0}
                    onChange={(e) => handleUpdateAccessory(accessory.key, Number(e.target.value))}
                    min="0"
                    className="bg-slate-600 border-slate-500 text-white text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateOrder}
            disabled={generateOrder.isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {generateOrder.isPending ? 'Generating...' : 'Generate Material Order'}
          </Button>
        </CardContent>
      </Card>

      {/* Section C: Results - Live Preview */}
      {latestOrder && latestOrder.lineItems && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Order Preview</span>
              <span className="text-sm font-normal text-slate-400">
                {latestOrder.orderNumber}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Preview Table */}
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left p-3 text-slate-300 text-sm">Product</th>
                    <th className="text-right p-3 text-slate-300 text-sm">Quantity</th>
                    <th className="text-right p-3 text-slate-300 text-sm">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(latestOrder.lineItems as any[]).map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-700">
                      <td className="p-3 text-white">{item.productName}</td>
                      <td className="p-3 text-right text-[#00d4aa] font-semibold">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-400">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {latestOrder.csvUrl && (
                <Button
                  onClick={() => handleDownloadCSV(latestOrder.csvUrl!)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Beacon CSV
                </Button>
              )}
              <Button
                onClick={() => handleSendToSupplier(latestOrder)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send to Supplier
              </Button>
            </div>

            <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Beacon PRO+ Upload:</strong> Download the CSV file and upload it directly to your Beacon PRO+ cart to instantly add all materials.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Orders History */}
      {existingOrders && existingOrders.length > 1 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Order History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {existingOrders.slice(1).map((order) => (
              <div key={order.id} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{order.orderNumber}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString()} • {order.totalSquares} squares
                  </p>
                </div>
                <div className="flex gap-2">
                  {order.csvUrl && (
                    <Button
                      onClick={() => handleDownloadCSV(order.csvUrl!)}
                      variant="outline"
                      size="sm"
                      className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
