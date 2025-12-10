import { useState, useEffect } from "react";
import { ProposalCalculator } from "../ProposalCalculator";
import { ProductSelector } from "../proposal/ProductSelector";
import { ProposalPDF } from "../proposal/ProposalPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Job } from "@/types";

interface JobProposalTabProps {
  jobId: number;
  job: Job;
  userRole: string;
  onUpdate: () => void;
}

export function JobProposalTab({ jobId, job, userRole, onUpdate }: JobProposalTabProps) {
  const [selectedShingleId, setSelectedShingleId] = useState<number | null>(null);
  const [proposalData, setProposalData] = useState<any>(null);
  
  // Initialize from job data
  useEffect(() => {
    if (job.selectedProductId) {
      setSelectedShingleId(job.selectedProductId);
    }
  }, [job.selectedProductId]);
  
  // Mutation to save product selection
  const updateProduct = trpc.crm.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Product saved");
      onUpdate(); // Refresh job data
    },
    onError: (error) => {
      toast.error(`Failed to save product: ${error.message}`);
    }
  });
  
  // Query to generate proposal content
  const { data: proposalQueryData, refetch: generateProposal, isFetching: isGenerating, error: proposalError } = trpc.ai.generateProposalContent.useQuery(
    { jobId },
    {
      enabled: false, // Don't run automatically
    }
  );
  
  // Handle proposal generation success/error
  useEffect(() => {
    if (proposalQueryData && !isGenerating) {
      setProposalData(proposalQueryData);
      toast.success("Proposal content generated!");
    }
  }, [proposalQueryData, isGenerating]);
  
  useEffect(() => {
    if (proposalError) {
      toast.error(`Failed to generate proposal: ${proposalError.message}`);
    }
  }, [proposalError]);
  
  const handleProductChange = (productId: number) => {
    setSelectedShingleId(productId);
    // Auto-save to database
    updateProduct.mutate({
      id: jobId,
      selectedProductId: productId
    });
  };
  
  const handleGenerateProposal = () => {
    generateProposal();
  };

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Shingle Product</h3>
        <ProductSelector 
          selectedProductId={selectedShingleId} 
          onChange={handleProductChange} 
        />
      </div>

      {/* Generate Proposal Button */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Generate Proposal</h3>
        <div className="flex items-center gap-4">
          {!proposalData ? (
            <Button
              onClick={handleGenerateProposal}
              disabled={isGenerating}
              className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-medium"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  AI Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Proposal PDF
                </>
              )}
            </Button>
          ) : (
            <PDFDownloadLink
              document={
                <ProposalPDF
                  job={proposalData.job}
                  company={proposalData.company}
                  product={proposalData.product}
                  aiContent={proposalData.aiContent}
                />
              }
              fileName={`proposal-${job.fullName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`}
            >
              {({ loading }) => (
                <Button
                  disabled={loading}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-slate-900 font-medium"
                >
                  {loading ? (
                    <>
                      <FileDown className="w-4 h-4 mr-2 animate-bounce" />
                      Preparing PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Proposal PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          )}
          
          {proposalData && (
            <Button
              variant="outline"
              onClick={handleGenerateProposal}
              disabled={isGenerating}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Regenerate
            </Button>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-3">
          Generate a professional PDF proposal with detailed content and product information.
        </p>
      </div>

      {/* Proposal Calculator */}
      <ProposalCalculator
        jobId={jobId}
        roofArea={job.solarApiData?.totalArea}
        manualAreaSqFt={job.manualAreaSqFt || undefined}
        solarCoverage={job.solarApiData?.solarCoverage || false}
        currentPricePerSq={job.pricePerSq}
        currentTotalPrice={job.totalPrice}
        currentCounterPrice={job.counterPrice}
        currentPriceStatus={job.priceStatus || undefined}
        userRole={userRole}
        onUpdate={onUpdate}
      />
    </div>
  );
}
