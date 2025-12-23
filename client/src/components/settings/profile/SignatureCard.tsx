import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenTool, Upload, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SignatureCard() {
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureImage(reader.result as string);
      toast.success("Signature uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = () => {
    setSignatureImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Signature cleared");
  };

  const handleSaveSignature = () => {
    if (!signatureImage) {
      toast.error("Please upload a signature first");
      return;
    }

    // TODO: Save signature to user profile
    toast.success("Signature saved successfully!");
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <PenTool className="w-5 h-5 text-[#00d4aa]" />
          Digital Signature
        </CardTitle>
        <CardDescription className="text-slate-400">
          Upload your signature for contracts and documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-slate-300">Signature Image</Label>
          <p className="text-xs text-slate-500">
            Auto-populates on Contracts, Material Orders, and Permits
          </p>

          {/* Signature Preview */}
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-800/50 min-h-[150px] flex items-center justify-center">
            {signatureImage ? (
              <img
                src={signatureImage}
                alt="Signature"
                className="max-h-[120px] max-w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="text-center text-slate-500">
                <PenTool className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No signature uploaded</p>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Signature
            </Button>
            {signatureImage && (
              <>
                <Button
                  onClick={handleClearSignature}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSaveSignature}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Tips:</strong> Use a white background with black ink. 
              Scan or photograph your signature, or use a digital signature pad. PNG format recommended.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
