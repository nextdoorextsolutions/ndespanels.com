import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Link2, Image, Clock, MapPin, Maximize2, X, ChevronLeft, ChevronRight, ExternalLink, Download, Trash2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

interface Photo {
  id: number;
  fileName: string;
  fileUrl: string;
  createdAt: Date | string;
  photoTakenAt?: Date | string | null;
  latitude?: string | null;
  longitude?: string | null;
  cameraModel?: string | null;
  aiTags?: string[];
  aiSeverity?: 'Low' | 'Medium' | 'High';
  aiAnalyzed?: boolean;
}

interface JobPhotosTabProps {
  photos: Photo[];
  jobId: number;
  canEdit: boolean;
  canDelete: boolean;
  isUploading: boolean;
  isOwner: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeletePhoto: (photoId: number) => void;
}

export function JobPhotosTab({
  photos,
  jobId,
  canEdit,
  canDelete,
  isUploading,
  isOwner,
  onFileUpload,
  onDeletePhoto,
}: JobPhotosTabProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [photoAnalysisResults, setPhotoAnalysisResults] = useState<Map<number, any>>(new Map());

  // AI Photo Processing mutation
  const processPhoto = trpc.ai.processJobPhoto.useMutation();

  // Helper to add Supabase image transformation params for thumbnails
  const getThumbnailUrl = (url: string, width: number = 300): string => {
    if (!url) return url;
    // Only apply transformations to Supabase Storage URLs
    if (url.includes('supabase.co/storage')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}width=${width}&resize=contain`;
    }
    return url;
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  // Analyze selected photos
  const handleAnalyzePhotos = async () => {
    const selectedPhotosList = photos.filter(p => selectedPhotos.has(p.id));
    
    if (selectedPhotosList.length === 0) {
      toast.error("Please select photos to analyze");
      return;
    }

    // Cap at 10 photos
    const photosToAnalyze = selectedPhotosList.slice(0, 10);
    if (selectedPhotosList.length > 10) {
      toast.info(`Analyzing first 10 of ${selectedPhotosList.length} selected photos`);
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: photosToAnalyze.length });

    for (let i = 0; i < photosToAnalyze.length; i++) {
      const photo = photosToAnalyze[i];
      
      try {
        const result = await processPhoto.mutateAsync({
          photoUrl: photo.fileUrl,
          jobId,
          photoId: photo.id,
          date: photo.photoTakenAt?.toString() || photo.createdAt.toString(),
        });

        if (result.success && result.analysis) {
          setPhotoAnalysisResults(prev => new Map(prev).set(photo.id, result.analysis));
          toast.success(`✨ Analyzed: ${photo.fileName}`, {
            description: result.analysis.damageDetected 
              ? `${result.analysis.severity} severity - ${result.analysis.tags.join(', ')}`
              : 'No damage detected',
          });
        } else {
          toast.error(`Failed to analyze ${photo.fileName}`);
        }
      } catch (error) {
        console.error('Photo analysis error:', error);
        toast.error(`Error analyzing ${photo.fileName}`);
      }

      setAnalysisProgress({ current: i + 1, total: photosToAnalyze.length });
    }

    setIsAnalyzing(false);
    setSelectedPhotos(new Set());
    toast.success(`🎉 Analysis complete! Processed ${photosToAnalyze.length} photos`);
  };

  return (
    <div>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Photo Gallery</h2>
          <span className="px-2 py-1 bg-[#00d4aa]/20 text-[#00d4aa] text-sm rounded-full">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedPhotos.size > 0 && (
            <Button
              onClick={handleAnalyzePhotos}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing 
                ? `Analyzing ${analysisProgress.current}/${analysisProgress.total}...` 
                : `✨ Analyze ${selectedPhotos.size} Photo${selectedPhotos.size !== 1 ? 's' : ''}`
              }
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              onClick={() => {
                const uploadUrl = `${window.location.origin}/upload?id=${jobId}`;
                navigator.clipboard.writeText(uploadUrl);
                toast.success("Upload link copied! Share with your field crew.");
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Copy Upload Link
            </Button>
          )}
          {canEdit && (
            <div>
              <input
                type="file"
                ref={photoInputRef}
                onChange={onFileUpload}
                className="hidden"
                accept="image/*"
                multiple
              />
              <Button 
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload Photos"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isAnalyzing && (
        <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white font-medium">
              🔮 Analysis in Progress...
            </span>
            <span className="text-sm text-purple-400">
              {analysisProgress.current} / {analysisProgress.total}
            </span>
          </div>
          <Progress 
            value={(analysisProgress.current / analysisProgress.total) * 100} 
            className="h-2 bg-slate-700"
          />
          <p className="text-xs text-slate-400 mt-2">
            Analyzing photos with Gemini Vision AI and applying watermarks...
          </p>
        </div>
      )}
      
      {photos.length > 0 ? (
        <>
          {/* Masonry-style Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {photos.map((photo, index) => {
              const isSelected = selectedPhotos.has(photo.id);
              const analysis = photoAnalysisResults.get(photo.id) || photo;
              const severityColors = {
                High: 'bg-red-500/20 text-red-300 border-red-500/30',
                Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                Low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              };
              
              return (
                <div 
                  key={photo.id} 
                  className={`group relative rounded-lg overflow-hidden bg-slate-800 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${
                    isSelected ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' : 'hover:shadow-[#00d4aa]/10'
                  }`}
                  onClick={() => setLightboxIndex(index)}
                >
                  {/* Selection Checkbox */}
                  <div 
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => togglePhotoSelection(photo.id, e)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-black/40 backdrop-blur-sm border border-white/30 hover:bg-black/60'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>

                  <div className="aspect-square">
                    <img 
                      src={getThumbnailUrl(photo.fileUrl, 300)} 
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* AI Tags Badge */}
                  {(analysis.aiTags || analysis.tags) && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        severityColors[(analysis.aiSeverity || analysis.severity || 'Low') as keyof typeof severityColors]
                      } backdrop-blur-sm`}>
                        {analysis.aiSeverity || analysis.severity}
                      </div>
                    </div>
                  )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">{photo.fileName}</p>
                    <p className="text-slate-300 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {photo.photoTakenAt 
                        ? new Date(photo.photoTakenAt).toLocaleString() 
                        : new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                    {photo.latitude && photo.longitude && (
                      <p className="text-[#00d4aa] text-xs flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        GPS: {parseFloat(photo.latitude).toFixed(4)}°, {parseFloat(photo.longitude).toFixed(4)}°
                      </p>
                    )}
                    
                    {/* AI Analysis Tags */}
                    {(analysis.aiTags || analysis.tags) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(analysis.aiTags || analysis.tags).map((tag: string, i: number) => (
                          <span 
                            key={i}
                            className="px-2 py-0.5 bg-purple-500/30 text-purple-200 text-xs rounded-full border border-purple-500/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button 
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Lightbox Modal */}
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div 
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
              onClick={() => setLightboxIndex(null)}
            >
              <button 
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                {lightboxIndex + 1} / {photos.length}
              </div>

              {lightboxIndex > 0 && (
                <button 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}

              {lightboxIndex < photos.length - 1 && (
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}

              <div 
                className="max-w-[90vw] max-h-[85vh] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={photos[lightboxIndex].fileUrl} 
                  alt={photos[lightboxIndex].fileName}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{photos[lightboxIndex].fileName}</p>
                    {photos[lightboxIndex].photoTakenAt ? (
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Taken {new Date(photos[lightboxIndex].photoTakenAt).toLocaleString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-sm">
                        Uploaded {new Date(photos[lightboxIndex].createdAt).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                    {photos[lightboxIndex].latitude && photos[lightboxIndex].longitude && (
                      <a 
                        href={`https://www.google.com/maps?q=${photos[lightboxIndex].latitude},${photos[lightboxIndex].longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00d4aa] text-sm flex items-center gap-2 mt-1 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPin className="w-4 h-4" />
                        View location on Google Maps
                      </a>
                    )}
                    {photos[lightboxIndex].cameraModel && (
                      <p className="text-slate-500 text-xs mt-1">
                        📷 {photos[lightboxIndex].cameraModel}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={photos[lightboxIndex].fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Original
                    </a>
                    <a 
                      href={photos[lightboxIndex].fileUrl} 
                      download={photos[lightboxIndex].fileName}
                      className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00b894] rounded-lg text-black text-sm flex items-center gap-2 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    {canDelete && (
                      <button 
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2 transition-colors"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (confirm('Delete this photo?')) {
                            onDeletePhoto(photos[lightboxIndex].id);
                            setLightboxIndex(null);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-800/50 rounded-xl border border-slate-700/50 border-dashed">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
            <Image className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg mb-2">No photos yet</p>
          <p className="text-slate-500 text-sm mb-4">Upload photos to document this job</p>
          {canEdit && (
            <Button 
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload First Photo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
