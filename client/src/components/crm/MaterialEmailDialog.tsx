import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface MaterialEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobAddress: string;
  shingleSystem: string;
  shingleColor: string;
  calculatedItems: {
    shingleBundles: number;
    starterBundles: number;
    hipRidgeBundles: number;
    underlaymentRolls: number;
    iceWaterRolls: number;
    nailBoxes: number;
  };
  accessories: {
    dripEdge: number;
    pipeBoots: number;
    gooseNecks: number;
    sprayPaint: number;
  };
}

export function MaterialEmailDialog({
  open,
  onOpenChange,
  jobAddress,
  shingleSystem,
  shingleColor,
  calculatedItems,
  accessories,
}: MaterialEmailDialogProps) {
  // Generate initial email body
  const generateEmailBody = () => {
    let body = `Material Order Request\n`;
    body += `Project: ${jobAddress}\n`;
    body += `Date: ${new Date().toLocaleDateString()}\n\n`;
    body += `MATERIALS NEEDED:\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Main materials
    if (calculatedItems.shingleBundles > 0) {
      body += `${calculatedItems.shingleBundles} Bundles - ${shingleSystem} Shingles (Color: ${shingleColor})\n`;
    }
    if (calculatedItems.starterBundles > 0) {
      body += `${calculatedItems.starterBundles} Bundles - Starter Strip Shingles\n`;
    }
    if (calculatedItems.hipRidgeBundles > 0) {
      body += `${calculatedItems.hipRidgeBundles} Bundles - Hip & Ridge Cap Shingles (Color: ${shingleColor})\n`;
    }
    if (calculatedItems.underlaymentRolls > 0) {
      body += `${calculatedItems.underlaymentRolls} Rolls - Synthetic Underlayment (10 SQ/Roll)\n`;
    }
    if (calculatedItems.iceWaterRolls > 0) {
      body += `${calculatedItems.iceWaterRolls} Rolls - Ice & Water Shield (66 LF/Roll)\n`;
    }
    if (calculatedItems.nailBoxes > 0) {
      body += `${calculatedItems.nailBoxes} Boxes - 1-1/4" Coil Roofing Nails (7,200 count)\n`;
    }

    // Accessories
    const hasAccessories = accessories.dripEdge > 0 || accessories.pipeBoots > 0 || 
                          accessories.gooseNecks > 0 || accessories.sprayPaint > 0;
    
    if (hasAccessories) {
      body += `\nACCESSORIES:\n`;
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      if (accessories.dripEdge > 0) {
        body += `${accessories.dripEdge} Pieces - Drip Edge (10' pieces)\n`;
      }
      if (accessories.pipeBoots > 0) {
        body += `${accessories.pipeBoots} Pieces - Lead Pipe Boot (2.5#)\n`;
      }
      if (accessories.gooseNecks > 0) {
        body += `${accessories.gooseNecks} Pieces - Goose Neck Vent (10" Galvanized)\n`;
      }
      if (accessories.sprayPaint > 0) {
        body += `${accessories.sprayPaint} Cans - Spray Paint\n`;
      }
    }

    body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `\nPlease coordinate delivery with our project manager.\n`;
    body += `Thank you!\n`;

    return body;
  };

  const [emailBody, setEmailBody] = useState(generateEmailBody());
  const [copied, setCopied] = useState(false);

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
      <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00d4aa]" />
            Draft Supplier Order
          </DialogTitle>
          <p className="text-sm text-slate-400">
            Edit the text below as needed, then open in your email client
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[400px]"
            placeholder="Material order details..."
          />

          <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
            <div className="text-blue-200 text-sm flex-1">
              <strong>Note:</strong> You can edit the text above to customize product names (e.g., change "Starter Strip" to "GAF Pro-Start")
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
            Open in Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
