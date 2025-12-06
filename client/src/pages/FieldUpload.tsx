import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, CheckCircle, Loader2, AlertCircle, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

export default function FieldUpload() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const jobId = parseInt(params.get("id") || "0");
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch job details
  const { data: jobData, isLoading, error } = trpc.crm.getJobForUpload.useQuery(
    { id: jobId },
    { enabled: jobId > 0 }
  );

  const uploadPhoto = trpc.crm.uploadFieldPhoto.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setUploadComplete(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !jobId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadedCount(0);

    let successCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadPhoto.mutateAsync({
          jobId,
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
        });

        successCount++;
        setUploadedCount(successCount);
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    
    if (successCount === selectedFiles.length) {
      setUploadComplete(true);
      setSelectedFiles([]);
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully!`);
    } else if (successCount > 0) {
      toast.warning(`${successCount} of ${selectedFiles.length} photos uploaded`);
    }
  };

  // Error state - invalid job ID
  if (jobId === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Job Selected</h1>
          <p className="text-slate-400">Please use a valid upload link with a job ID.</p>
          <p className="text-slate-500 text-sm mt-2">Example: /upload?id=123</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00d4aa] animate-spin" />
      </div>
    );
  }

  // Job not found
  if (error || !jobData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="text-slate-400">Could not find a job with ID #{jobId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#00d4aa]/20 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-[#00d4aa]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Upload Photos for
        </h1>
        <p className="text-xl sm:text-2xl font-semibold text-[#00d4aa] mb-2">
          {jobData.fullName}
        </p>
        <p className="text-slate-400 text-sm sm:text-base">
          {jobData.address}, {jobData.cityStateZip}
        </p>
      </div>

      {/* Success State */}
      {uploadComplete && (
        <div className="max-w-lg mx-auto mb-8">
          <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {/* Hammer animation */}
              <div className="absolute inset-0 flex items-center justify-center animate-bounce">
                <span className="text-6xl">🔨</span>
              </div>
            </div>
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-400 mb-2">Success!</h2>
            <p className="text-slate-300">
              {uploadedCount} photo{uploadedCount > 1 ? 's' : ''} uploaded successfully
            </p>
            <p className="text-slate-400 text-sm mt-2">Nailed it! 🔨</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="max-w-lg mx-auto">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
        />

        {/* Large Upload Button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 sm:h-40 bg-[#00d4aa] hover:bg-[#00b894] text-black font-bold text-xl sm:text-2xl rounded-2xl shadow-lg shadow-[#00d4aa]/30 transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-12 h-12 sm:w-16 sm:h-16" />
            <span>TAP TO SELECT PHOTOS</span>
          </div>
        </Button>

        <p className="text-center text-slate-400 text-sm mt-3">
          Select multiple photos at once
        </p>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''} selected
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="text-slate-400 hover:text-white"
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {selectedFiles.slice(0, 6).map((file, index) => (
                <div key={index} className="relative aspect-square bg-slate-700 rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {selectedFiles.length > 6 && (
                <div className="aspect-square bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-slate-300 font-semibold">
                    +{selectedFiles.length - 6} more
                  </span>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                <p className="text-center text-slate-400 text-sm mt-2">
                  {uploadedCount} of {selectedFiles.length} uploaded
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full h-16 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {uploading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>UPLOADING...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Upload className="w-6 h-6" />
                  <span>UPLOAD {selectedFiles.length} PHOTO{selectedFiles.length > 1 ? 'S' : ''}</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Job Info Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">
            Job #{jobId} • NextDoor Exterior Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
