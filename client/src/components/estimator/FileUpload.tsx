import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    } else {
      alert("Note: Client-side PDF parsing is limited in this demo. Please paste extracted text or upload a .txt file.");
    }
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
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors group"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              accept=".txt, .pdf"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-slate-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-slate-400">Supported formats: TXT, PDF (Text content)</p>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
              <FileText className="w-4 h-4" />
              <span>Loaded: {fileName}</span>
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
