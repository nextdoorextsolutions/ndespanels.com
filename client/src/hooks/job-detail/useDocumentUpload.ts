/**
 * useDocumentUpload Hook
 * Handles file upload logic for documents and photos
 */

import { toast } from "sonner";

interface UseDocumentUploadProps {
  jobId: number;
  onRefetch: () => void;
}

export function useDocumentUpload({ jobId, onRefetch }: UseDocumentUploadProps) {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId.toString());
      formData.append("fileType", type);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          toast.success(`${type === "document" ? "Document" : "Photo"} uploaded`);
          onRefetch();
        } else {
          toast.error("Upload failed");
        }
      } catch (error) {
        toast.error("Upload error");
      }
    }
  };

  return {
    handleFileUpload,
  };
}
