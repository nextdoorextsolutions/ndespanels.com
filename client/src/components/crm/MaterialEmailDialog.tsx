import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Copy, Check, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface MaterialEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobAddress: string;
  roofArea: number;  // Total roof area in sq ft
  perimeter?: number;  // Perimeter in linear feet
  ridgeLength?: number;  // Ridge + Hip length in linear feet
  shingleColor?: string;
}

export function MaterialEmailDialog({
  open,
  onOpenChange,
  jobAddress,
  roofArea,
  perimeter = 0,
  ridgeLength = 0,
  shingleColor = '',
}: MaterialEmailDialogProps) {
  // Accessory inputs
  const [dripEdge, setDripEdge] = useState(0);
  const [pipeBoots, setPipeBoots] = useState(0);
  const [sprayPaint, setSprayPaint] = useState(0);
  const [gooseNecks, setGooseNecks] = useState(0);
  const [copied, setCopied] = useState(false);

  // Calculate quantities using Beacon math
  const calculateQuantities = () => {
    // Shingles (BDL): (Area * 1.15) / 33.3 -> Round Up (15% waste)
    const shingleBundles = Math.ceil((roofArea * 1.15) / 33.3);
    
    // Starter (BDL): Perimeter / 100 -> Round Up
    const starterBundles = perimeter > 0 ? Math.ceil(perimeter / 100) : Math.ceil(roofArea / 1000);
    
    // Hip (BDL): Hips / 25 -> Round Up
    const hipBundles = ridgeLength > 0 ? Math.ceil(ridgeLength * 0.5 / 25) : Math.ceil(roofArea / 1000);
    
    // Ridge (BDL): Ridges / 25 -> Round Up
    const ridgeBundles = ridgeLength > 0 ? Math.ceil(ridgeLength * 0.5 / 25) : Math.ceil(roofArea / 1000);
    
    // Underlayment (RL): Area / 1000 -> Round Up
    const underlaymentRolls = Math.ceil(roofArea / 1000);
    
    // Synthetic Underlayment (RL): Estimate based on eaves and valleys
    const syntheticUnderlaymentRolls = Math.ceil(perimeter / 200) || Math.ceil(roofArea / 2000);
    
    // Nails (CTN): Area / 2000 -> Round Up (1 box per 20 squares)
    const nailBoxes = Math.ceil(roofArea / 2000);

    return {
      shingleBundles,
      starterBundles,
      hipBundles,
      ridgeBundles,
      underlaymentRolls,
      syntheticUnderlaymentRolls,
      nailBoxes,
    };
  };

  // Generate email body
  const generateEmailBody = () => {
    const calc = calculateQuantities();
    
    let body = `Subject: Material Order - ${jobAddress}\n\n`;
    body += `Please deliver to: ${jobAddress}\n\n`;
    body += `-- ROOFING SYSTEM --\n`;
    body += `[ ] ${calc.shingleBundles} BDL - Tamko Titan XT (Color: ${shingleColor || '_______'})\n`;
    body += `[ ] ${calc.starterBundles} BDL - Starter Strip\n`;
    body += `[ ] ${calc.hipBundles} BDL - Hip Cap\n`;
    body += `[ ] ${calc.ridgeBundles} BDL - Ridge Cap\n`;
    body += `[ ] ${calc.underlaymentRolls} RL  - Felt Underlayment\n`;
    body += `[ ] ${calc.syntheticUnderlaymentRolls} RL  - Synthetic Underlayment\n`;
    body += `[ ] ${calc.nailBoxes} CTN - Coil Nails (1-1/4")\n\n`;
    
    body += `-- ACCESSORIES --\n`;
    if (dripEdge > 0) body += `[ ] ${dripEdge} PC  - Drip Edge (White, 10')\n`;
    if (pipeBoots > 0) body += `[ ] ${pipeBoots} PC  - Pipe Boots (Lead)\n`;
    if (sprayPaint > 0) body += `[ ] ${sprayPaint} EA  - Spray Paint\n`;
    if (gooseNecks > 0) body += `[ ] ${gooseNecks} PC  - Goose Neck Vents\n`;
    
    body += `\nNotes: [Type special instructions here]`;

    return body;
  };

  const [emailBody, setEmailBody] = useState(generateEmailBody());

  // Regenerate email when inputs change
  useEffect(() => {
    setEmailBody(generateEmailBody());
  }, [roofArea, perimeter, ridgeLength, shingleColor, dripEdge, pipeBoots, sprayPaint, gooseNecks]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInEmail = () => {
    const subject = encodeURIComponent(`Material Order - ${jobAddress}`);
    const body = encodeURIComponent(emailBody);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#00d4aa]" />
            Draft Supplier Order
          </DialogTitle>
          <p className="text-sm text-slate-400">
            Quantities calculated automatically • Add accessories on the left • Edit text on the right
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Side: Accessory Inputs */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#00d4aa]" />
                Accessories
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">Drip Edge (10' pieces)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={dripEdge}
                    onChange={(e) => setDripEdge(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300 text-sm">Pipe Boots (Lead)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pipeBoots}
                    onChange={(e) => setPipeBoots(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300 text-sm">Spray Paint (Cans)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={sprayPaint}
                    onChange={(e) => setSprayPaint(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300 text-sm">Goose Neck Vents</Label>
                  <Input
                    type="number"
                    min="0"
                    value={gooseNecks}
                    onChange={(e) => setGooseNecks(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-200 text-xs">
                <strong>Auto-Calculated:</strong> Shingles, starter, ridge cap, underlayment, and nails are calculated based on roof area ({Math.round(roofArea)} sq ft)
              </p>
            </div>
          </div>

          {/* Right Side: Email Preview */}
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Email Preview (Editable)</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[400px]"
                placeholder="Material order details..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={handleOpenInEmail}
            className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-semibold"
          >
            <Mail className="w-4 h-4 mr-2" />
            Open in Email App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
