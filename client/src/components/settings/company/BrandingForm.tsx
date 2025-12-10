import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Building2, Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { CompanySettingsFormData } from "@/lib/validations/companySettings";

interface BrandingFormProps {
  form: UseFormReturn<CompanySettingsFormData>;
}

export function BrandingForm({ form }: BrandingFormProps) {
  const { watch, setValue } = form;
  const logoUrl = watch("logoUrl");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only JPG, PNG, and WebP images are allowed",
      });
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Maximum file size is 2MB",
      });
      return;
    }

    // Upload file
    setIsUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.logoUrl) {
        setValue("logoUrl", data.logoUrl);
        toast.success("Logo uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      toast.error("Failed to upload logo", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#00d4aa]" />
          Company Branding
        </CardTitle>
        <CardDescription className="text-slate-400">
          Upload your company logo for reports, proposals, and invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="w-32 h-32 rounded-lg bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-[#00d4aa] animate-spin" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-12 h-12 text-slate-500" />
            )}
          </div>

          {/* Upload Controls */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {logoUrl ? "Change Logo" : "Upload Logo"}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500">
              PNG, JPG, WebP up to 2MB<br />
              Recommended: 200x200px square
            </p>
            {logoUrl && !isUploading && (
              <p className="text-xs text-[#00d4aa]">
                ✓ Logo uploaded
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
