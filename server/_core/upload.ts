import type { Express, Request, Response } from "express";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { documents, activities } from "../../drizzle/schema";
import { logEditHistory } from "../lib/editHistory";

/**
 * Register file upload endpoint
 * Handles multipart/form-data uploads from the frontend
 */
export function registerUploadRoute(app: Express) {
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      // Parse multipart form data manually (Express doesn't do this by default)
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
      }

      // Get boundary from content-type header
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        return res.status(400).json({ error: 'Missing boundary in Content-Type' });
      }

      // Collect chunks
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      await new Promise<void>((resolve, reject) => {
        req.on('end', () => resolve());
        req.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      
      // Parse multipart data
      const parts = parseMultipartData(buffer, boundary);
      
      const jobId = parts.get('jobId');
      const fileType = parts.get('fileType');
      const fileData = parts.get('file');

      if (!jobId || !fileType || !fileData) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          received: { jobId: !!jobId, fileType: !!fileType, file: !!fileData }
        });
      }

      const { filename, data: fileBuffer } = fileData as { filename: string; data: Buffer };
      
      // Generate safe filename
      const timestamp = Date.now();
      const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `job-${jobId}/${timestamp}_${safeName}`;

      // Determine content type
      const contentTypeMap: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const mimeType = contentTypeMap[ext] || 'application/octet-stream';

      // Upload to Supabase Storage
      const bucket = fileType === 'document' ? 'documents' : 'job-attachments';
      const { url } = await storagePut(filePath, fileBuffer, mimeType, bucket);

      // Get database connection
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection failed');
      }

      // Insert document record
      const category = fileType === 'document' ? 'other' : 'inspection_photo';
      const [document] = await db.insert(documents).values({
        reportRequestId: parseInt(jobId),
        fileName: filename,
        fileUrl: url,
        fileSize: fileBuffer.length,
        category,
        uploadedBy: null, // TODO: Get from session
      }).returning();

      // Log activity
      await db.insert(activities).values({
        reportRequestId: parseInt(jobId),
        userId: null,
        activityType: fileType === 'document' ? 'document_uploaded' : 'photo_uploaded',
        description: `Uploaded ${fileType}: ${filename}`,
      });

      console.log(`[Upload] Successfully uploaded ${filename} to ${url}`);
      
      res.json({ 
        success: true, 
        documentId: document.id,
        url 
      });

    } catch (error: any) {
      console.error('[Upload] Error:', error);
      res.status(500).json({ 
        error: 'Upload failed', 
        message: error.message 
      });
    }
  });
}

/**
 * Parse multipart/form-data manually
 */
function parseMultipartData(buffer: Buffer, boundary: string): Map<string, any> {
  const parts = new Map<string, any>();
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  
  let start = 0;
  while (true) {
    // Find next boundary
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;
    
    // Find end of headers (double CRLF)
    const headersEnd = buffer.indexOf('\r\n\r\n', boundaryIndex);
    if (headersEnd === -1) break;
    
    // Extract headers
    const headers = buffer.slice(boundaryIndex + boundaryBuffer.length, headersEnd).toString();
    
    // Find next boundary to get content
    const nextBoundary = buffer.indexOf(boundaryBuffer, headersEnd);
    if (nextBoundary === -1) break;
    
    // Extract content (minus trailing CRLF)
    const content = buffer.slice(headersEnd + 4, nextBoundary - 2);
    
    // Parse Content-Disposition header
    const dispositionMatch = headers.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/);
    if (dispositionMatch) {
      const fieldName = dispositionMatch[1];
      const filename = dispositionMatch[2];
      
      if (filename) {
        // File field
        parts.set(fieldName, { filename, data: content });
      } else {
        // Text field
        parts.set(fieldName, content.toString());
      }
    }
    
    start = nextBoundary;
  }
  
  return parts;
}
