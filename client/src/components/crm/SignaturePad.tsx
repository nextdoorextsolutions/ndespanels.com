import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, RotateCcw, Check, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureComplete: (signatureDataUrl: string) => void;
  customerName: string;
  documentType: "insurance" | "cash" | "financed";
  pdfPreviewUrl?: string;
}

export function SignaturePad({
  isOpen,
  onClose,
  onSignatureComplete,
  customerName,
  documentType,
  pdfPreviewUrl,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(true);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  // Get coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    setIsDrawing(true);
    setHasSignature(true);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Draw
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear signature
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Save signature
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      toast.error("Please provide a signature first");
      return;
    }

    // Convert canvas to data URL
    const signatureDataUrl = canvas.toDataURL("image/png");
    onSignatureComplete(signatureDataUrl);
    toast.success("Signature captured successfully!");
  };

  // Download PDF preview
  const downloadPdf = () => {
    if (pdfPreviewUrl) {
      const link = document.createElement("a");
      link.href = pdfPreviewUrl;
      link.download = `proposal-preview.pdf`;
      link.click();
      toast.success("PDF downloaded");
    }
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case "insurance":
        return "Contingency Agreement & Letter of Authorization";
      case "cash":
        return "Roofing Proposal - Cash Payment";
      case "financed":
        return "Roofing Proposal - Financing";
      default:
        return "Roofing Proposal";
    }
  };

  // Debug logging for modal state
  useEffect(() => {
    console.log('[SignaturePad] isOpen prop changed:', isOpen);
    console.log('[SignaturePad] pdfPreviewUrl:', pdfPreviewUrl);
    console.log('[SignaturePad] customerName:', customerName);
  }, [isOpen, pdfPreviewUrl, customerName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00d4aa]" />
            Document Signature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Document Type</p>
                  <p className="text-lg font-semibold text-white">{getDocumentTitle()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Customer</p>
                  <p className="text-lg font-semibold text-white">{customerName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PDF Preview */}
            {showPdfPreview && pdfPreviewUrl && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Document Preview</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadPdf}
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg overflow-hidden" style={{ height: "500px" }}>
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Review the document before signing
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Signature Pad */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Customer Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Instructions */}
                <div className="p-3 bg-blue-900/20 rounded border border-blue-500/30">
                  <p className="text-sm text-blue-400">
                    <strong>Instructions:</strong> Please sign in the box below using your finger or stylus.
                  </p>
                </div>

                {/* Canvas */}
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-64 border-2 border-slate-600 rounded-lg cursor-crosshair bg-white touch-none"
                    style={{ touchAction: "none" }}
                  />
                  
                  {/* Signature Line */}
                  <div className="absolute bottom-8 left-8 right-8 border-b-2 border-slate-400 pointer-events-none">
                    <p className="text-xs text-slate-500 mt-1">Sign above this line</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSignature}
                    disabled={!hasSignature}
                    className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={saveSignature}
                    disabled={!hasSignature}
                    className="flex-1 bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept & Sign
                  </Button>
                </div>

                {/* Legal Text */}
                <div className="p-3 bg-slate-700/50 rounded text-xs text-slate-400">
                  <p className="font-semibold mb-1">Legal Agreement</p>
                  <p>
                    By signing above, {customerName} acknowledges that they have read, understood, and agree to the terms
                    and conditions outlined in this {getDocumentTitle().toLowerCase()}. This electronic signature has the
                    same legal effect as a handwritten signature.
                  </p>
                  <p className="mt-2 text-slate-500">
                    Date: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <div className="text-sm text-slate-400">
              {hasSignature ? (
                <span className="text-green-400">✓ Signature ready</span>
              ) : (
                <span>Waiting for signature...</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
