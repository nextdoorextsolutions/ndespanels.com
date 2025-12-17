/**
 * JobDetailHeader Component
 * Mobile action bar, desktop header, and action buttons for job detail page
 */

import { Link } from "wouter";
import { ArrowLeft, Bell, BellOff, Phone, Mail, Navigation, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Job } from "@/types/job";

interface JobDetailHeaderProps {
  job: Job;
  jobId: number;
  canEdit: boolean;
  canDelete: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  onToggleFollowUp: () => void;
  onDeleteJob: () => void;
  isDeleting: boolean;
}

export function JobDetailHeader({
  job,
  jobId,
  canEdit,
  canDelete,
  showDeleteDialog,
  setShowDeleteDialog,
  onToggleFollowUp,
  onDeleteJob,
  isDeleting,
}: JobDetailHeaderProps) {
  return (
    <>
      {/* Mobile Action Bar - Sticky at top on mobile */}
      <div className="md:hidden sticky top-14 z-50 bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-around gap-2">
          <a 
            href={`tel:${job.phone}`}
            className="flex-1"
          >
            <Button 
              className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold min-h-11"
            >
              <Phone className="w-5 h-5 mr-2" />
              Call
            </Button>
          </a>
          <a 
            href={`sms:${job.phone}`}
            className="flex-1"
          >
            <Button 
              variant="outline"
              className="w-full border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10 min-h-11"
            >
              <Mail className="w-5 h-5 mr-2" />
              Text
            </Button>
          </a>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address + ' ' + job.cityStateZip)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button 
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 min-h-11"
            >
              <Navigation className="w-5 h-5 mr-2" />
              Map
            </Button>
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-14 md:top-14 z-40 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/crm">
                <a className="text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </a>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{job.fullName}</h1>
                <p className="text-slate-400 text-sm">{job.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={onToggleFollowUp}
                  className={job.needsFollowUp 
                    ? "bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/30"
                    : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {job.needsFollowUp ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Clear Follow Up
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Request Follow Up
                    </>
                  )}
                </Button>
              )}
              {canDelete && (
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="bg-red-900/20 border-red-600 text-red-400 hover:bg-red-900/40 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Job
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Job?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-300">
                        Are you sure you want to delete this job for <strong className="text-white">{job.fullName}</strong>?
                        <br /><br />
                        This will permanently delete:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Job details and customer information</li>
                          <li>All documents and photos</li>
                          <li>Messages and timeline</li>
                          <li>Edit history</li>
                        </ul>
                        <br />
                        <strong className="text-red-400">This action cannot be undone.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDeleteJob}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isDeleting ? "Deleting..." : "Delete Job"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
