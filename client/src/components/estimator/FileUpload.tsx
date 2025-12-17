import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
}

interface FilePreview {
  file: File;
  previewUrl: string;
  status: 'ready' | 'uploading' | 'done';
}

const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image if needed
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if width > 1920px
          if (width > 1920) {
            height = (height * 1920) / width;
            width = 1920;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            0.8 // Quality 80%
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      // Handle text files
      if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setInputText(text);
        };
        reader.readAsText(file);
      }
      // Handle images - create preview
      else if (file.type.startsWith('image/')) {
        const compressedFile = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedFile);
        setFilePreviews(prev => [...prev, {
          file: compressedFile,
          previewUrl,
          status: 'ready'
        }]);
      }
      // Handle PDFs
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        alert("Note: Client-side PDF parsing is limited. Please paste extracted text or upload a .txt file.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const removePreview = (index: number) => {
    setFilePreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim().length < 10) {
      alert("Please provide valid scope text.");
      return;
    }
    onAnalyze(inputText);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Upload Scope of Loss
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload an exported Xactimate report (text) or paste the content below for AI auditing.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div 
            onClick={handleTriggerUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all group ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              accept=".txt, .pdf, image/*"
              multiple
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-slate-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-slate-400">Supported formats: TXT, PDF, Images (JPG, PNG)</p>
              {isDragging && (
                <p className="text-sm text-blue-600 font-medium mt-2 animate-pulse">Drop files here!</p>
              )}
            </div>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
              <FileText className="w-4 h-4" />
              <span>Loaded: {fileName}</span>
            </div>
          )}

          {filePreviews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Previews ({filePreviews.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
                      <img 
                        src={preview.previewUrl} 
                        alt={preview.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removePreview(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="mt-1 text-xs text-slate-500 truncate">
                      {preview.file.name}
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      {preview.status === 'ready' && '✓ Ready to upload'}
                      {preview.status === 'uploading' && 'Uploading...'}
                      {preview.status === 'done' && '✓ Uploaded'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or paste text manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="Paste Xactimate Scope text here (e.g., RFG 300S QTY: 20...)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            ></textarea>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading || inputText.length < 10}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
                  ${isLoading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Scope...
                  </>
                ) : (
                  <>
                    Run Audit
                    <AlertCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
