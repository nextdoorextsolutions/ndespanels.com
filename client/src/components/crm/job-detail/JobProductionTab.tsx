import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Grid3X3, DollarSign } from "lucide-react";
import { RoofingReportView } from "@/components/RoofingReportView";
import { GoogleMapsLoader } from "@/components/GoogleMapsLoader";
import type { Job } from "@/types";

interface JobProductionTabProps {
  job: Job;
  jobId: number;
  onGenerateReport: () => void;
  isGenerating: boolean;
}

export function JobProductionTab({ job, jobId, onGenerateReport, isGenerating }: JobProductionTabProps) {
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  if (job.solarApiData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isGenerating}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-[#00d4aa] border-t-transparent rounded-full mr-2" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Update Report
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  API Charge Warning
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300">
                  <div className="space-y-3">
                    <p>
                      Regenerating this report will make a new request to our measurement service, which may incur additional charges to your account.
                    </p>
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                      <p className="text-sm text-yellow-400 font-semibold">
                        ⚠️ You will be charged for this API call
                      </p>
                    </div>
                    <p className="text-sm">
                      Are you sure you want to continue?
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  No, Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    onGenerateReport();
                  }}
                  className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                >
                  Yes, Regenerate Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <GoogleMapsLoader>
          <RoofingReportView
            solarApiData={job.solarApiData}
            jobData={{
              fullName: job.fullName,
              address: job.address,
              cityStateZip: job.cityStateZip,
            }}
            isGoogleMapsLoaded={true}
          />
        </GoogleMapsLoader>
      </div>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="py-12">
        <div className="text-center max-w-md mx-auto">
          <Grid3X3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Production Report Not Generated</h3>
          <p className="text-slate-400 mb-4">
            Generate a professional roof measurement report with automated measurements.
          </p>
          
          {job.latitude && job.longitude ? (
            <>
              <p className="text-sm text-slate-500 mb-6">
                Coordinates: {job.latitude.toFixed(6)}, {job.longitude.toFixed(6)}
              </p>
              <Button
                onClick={onGenerateReport}
                disabled={isGenerating}
                className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2" />
                    Analyzing Roof...
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500 mt-3">
                Note: This will generate automated roof measurements
              </p>
            </>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-400">
                ⚠️ This job doesn't have valid coordinates. Please update the address with a valid location to generate a report.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
