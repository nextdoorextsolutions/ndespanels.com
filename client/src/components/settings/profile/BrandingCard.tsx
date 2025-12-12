import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Upload, Image as ImageIcon, Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";

interface BrandingCardProps {
  user: {
    id: number;
    repCode: string | null;
  };
  onUpdate: () => void;
}

export default function BrandingCard({ user, onUpdate }: BrandingCardProps) {
  const { user: authUser } = useAuth();
  const [calendarColor, setCalendarColor] = useState("#00d4aa");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(authUser?.image || null);
  const [isUploading, setIsUploading] = useState(false);

  const updateAvatarMutation = trpc.users.updateAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("Profile photo updated successfully!");
      setProfilePhoto(null);
      onUpdate();
    },
    onError: (error) => {
      toast.error(`Failed to update photo: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setProfilePhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!profilePhoto) {
      toast.error("Please select a photo first");
      return;
    }

    if (!supabase) {
      toast.error("Storage service not available");
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('CRM files')
        .upload(filePath, profilePhoto, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('CRM files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update user avatar via TRPC
      await updateAvatarMutation.mutateAsync({ avatarUrl: publicUrl });
      
      // Update preview to show new image
      setPhotoPreview(publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const colorPresets = [
    { name: "Teal", value: "#00d4aa" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Purple", value: "#a855f7" },
    { name: "Green", value: "#22c55e" },
    { name: "Pink", value: "#ec4899" },
    { name: "Yellow", value: "#eab308" },
  ];

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#00d4aa]" />
          Branding & Identity
        </CardTitle>
        <CardDescription className="text-slate-400">
          Customize your profile appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Photo */}
        <div className="space-y-3">
          <Label className="text-slate-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Profile Photo
          </Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-500" />
              )}
            </div>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="bg-slate-800 border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#00d4aa] file:text-black hover:file:bg-[#00b894]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Appears in "Meet Your Rep" section of proposals (Max 5MB)
              </p>
            </div>
          </div>
          {profilePhoto && (
            <Button
              onClick={handleUploadPhoto}
              size="sm"
              disabled={isUploading}
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
          )}
        </div>

        {/* Calendar Color */}
        <div className="space-y-3">
          <Label className="text-slate-300">Calendar Color</Label>
          <p className="text-xs text-slate-500">
            Your jobs will appear in this color on the dispatch calendar
          </p>
          <div className="grid grid-cols-4 gap-2">
            {colorPresets.map((color) => (
              <button
                key={color.value}
                onClick={() => setCalendarColor(color.value)}
                className={`h-12 rounded-lg border-2 transition-all ${
                  calendarColor === color.value
                    ? "border-white scale-105"
                    : "border-slate-600 hover:border-slate-400"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                <span className="sr-only">{color.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-12 h-12 rounded-lg border-2 border-slate-600"
              style={{ backgroundColor: calendarColor }}
              title={calendarColor}
            />
            <Input
              type="color"
              value={calendarColor}
              onChange={(e) => setCalendarColor(e.target.value)}
              className="w-20 h-10 bg-slate-800 border-slate-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Rep Code (Read-Only) */}
        <div className="space-y-2">
          <Label className="text-slate-300 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Rep Code
          </Label>
          <Input
            value={user.repCode || "Not assigned"}
            readOnly
            className="bg-slate-800 border-slate-600 text-slate-400 cursor-not-allowed font-mono"
          />
          <p className="text-xs text-slate-500">
            Used for tracking commissions and sales attribution
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
