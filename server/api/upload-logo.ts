import { Request, Response } from "express";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { companySettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Upload company logo to Supabase storage
 * POST /api/upload-logo
 * 
 * Accepts multipart/form-data with 'logo' file field
 * Stores in: company-logos/logo-{timestamp}.{ext}
 * Updates company_settings.logo_url
 */
export async function uploadCompanyLogo(req: Request, res: Response) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    
    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: "Invalid file type. Only JPG, PNG, and WebP images are allowed." 
      });
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return res.status(400).json({ 
        error: "File too large. Maximum size is 2MB." 
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop() || 'png';
    const filename = `logo-${timestamp}.${extension}`;
    const filePath = `company-logos/${filename}`;

    // Upload to Supabase Storage
    const { url } = await storagePut(
      filePath,
      file.buffer,
      file.mimetype
    );

    // Update company settings with new logo URL
    const db = await getDb();
    if (db) {
      await db
        .update(companySettings)
        .set({
          logoUrl: url,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, 1));
    }

    return res.status(200).json({
      success: true,
      logoUrl: url,
      message: "Logo uploaded successfully",
    });

  } catch (error: any) {
    console.error("[UploadLogo] Error:", error);
    return res.status(500).json({ 
      error: "Failed to upload logo",
      message: error.message 
    });
  }
}
