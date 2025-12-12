import React, { useState } from 'react';
import FileUpload from './FileUpload';
import AuditResults from './AuditResults';
import { trpc } from '@/lib/trpc';
import { AuditResult } from './types';

function EstimatorTool() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = trpc.estimates.analyzeScope.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      console.error(err);
      setError(err.message || "Failed to analyze scope. Please try again.");
      setResult(null);
    },
  });

  const handleAnalyze = async (text: string) => {
    setError(null);
    analyzeMutation.mutate({ text });
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {!result ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-10 max-w-2xl">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                The Senior Estimator <br />
                <span className="text-blue-600">That Never Sleeps</span>
              </h1>
              <p className="text-lg text-slate-600">
                Upload your Xactimate Scope of Loss. Zerox will parse the codes, find the missing profit, and audit for red flags in seconds.
              </p>
            </div>
            <FileUpload onAnalyze={handleAnalyze} isLoading={analyzeMutation.isPending} />
            
            <div className="mt-12 text-center">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Try pasting this sample:</p>
              <div className="bg-slate-200 p-4 rounded text-left text-xs text-slate-600 font-mono w-full max-w-lg mx-auto overflow-x-auto whitespace-pre">
{`State Farm Claim #55-9021-X44
Loss Date: 05/12/2024
Description: Hail Damage to Dwelling

RFG 300S  30.00 SQ  @ $265.00  = $7,950.00
RFG R&R   30.00 SQ  @ $55.00   = $1,650.00
SDG VINYL 400 SF    @ $4.50    = $1,800.00
GUT 5     150 LF    @ $7.00    = $1,050.00
PNT EXT   2000 SF   @ $0.95    = $1,900.00

Total: $14,350.00
ACV: $10,000.00
Deductible: $1,000.00`}
              </div>
            </div>
          </div>
        ) : (
          <AuditResults data={result} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

export default EstimatorTool;
