import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Eye, Download, Trash2 } from "lucide-react";

interface Document {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: Date | string;
}

interface JobDocumentsTabProps {
  documents: Document[];
  canEdit: boolean;
  canDelete: boolean;
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteDocument: (documentId: number) => void;
  onPreviewDocument: (doc: { url: string; name: string; type: string }) => void;
}

export function JobDocumentsTab({
  documents,
  canEdit,
  canDelete,
  isUploading,
  onFileUpload,
  onDeleteDocument,
  onPreviewDocument,
}: JobDocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canEdit) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic event to pass to onFileUpload
      const syntheticEvent = {
        target: { files },
      } as React.ChangeEvent<HTMLInputElement>;
      onFileUpload(syntheticEvent);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all rounded-lg ${
        isDragging ? 'ring-2 ring-[#00d4aa] ring-offset-2 ring-offset-slate-900' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Documents ({documents.length})</h2>
        {canEdit && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-[#00d4aa] hover:bg-[#00b894] text-black"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        )}
      </div>

      {isDragging && documents.length > 0 && (
        <div className="mb-4 p-4 border-2 border-dashed border-[#00d4aa] bg-[#00d4aa]/10 rounded-lg text-center">
          <p className="text-[#00d4aa] font-semibold">Drop files here to upload</p>
        </div>
      )}
      
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card 
              key={doc.id} 
              className="bg-slate-800 border-slate-700 hover:border-[#00d4aa] transition-colors cursor-pointer group"
              onClick={() => onPreviewDocument({ url: doc.fileUrl, name: doc.fileName, type: doc.fileType || '' })}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#00d4aa]/20 transition-colors">
                    <FileText className="w-5 h-5 text-blue-400 group-hover:text-[#00d4aa] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate group-hover:text-[#00d4aa] transition-colors">{doc.fileName}</p>
                    <p className="text-sm text-slate-400">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Unknown size"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-[#00d4aa] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to view
                    </p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => onPreviewDocument({ url: doc.fileUrl, name: doc.fileName, type: doc.fileType || '' })}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {canDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => onDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card 
          className={`bg-slate-800 border-2 transition-all ${
            isDragging 
              ? 'border-[#00d4aa] bg-[#00d4aa]/10' 
              : 'border-slate-700 border-dashed'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="py-12 text-center">
            <div className={`transition-all ${
              isDragging ? 'scale-110' : 'scale-100'
            }`}>
              <FileText className={`w-12 h-12 mx-auto mb-3 transition-colors ${
                isDragging ? 'text-[#00d4aa]' : 'text-slate-500'
              }`} />
              <p className={`transition-colors ${
                isDragging ? 'text-[#00d4aa] font-semibold' : 'text-slate-400'
              }`}>
                {isDragging ? 'Drop files here' : 'No documents uploaded yet'}
              </p>
              {canEdit && !isDragging && (
                <>
                  <Button 
                    variant="link" 
                    className="mt-2 text-[#00d4aa]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload your first document
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">or drag and drop files here</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
