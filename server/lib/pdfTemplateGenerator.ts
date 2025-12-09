import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
import { 
  getTemplateConfig, 
  getTemplateUrl,
  type TemplateConfig,
  type FieldConfig 
} from './pdfTemplateConfig';

interface ProposalData {
  // Customer Info
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  propertyAddress: string;
  cityStateZip: string;
  
  // Pricing
  totalPrice: number;
  pricePerSq: number;
  roofSquares: number;
  
  // Deal Type
  dealType: 'insurance' | 'cash' | 'financed';
  insuranceCarrier?: string;
  claimNumber?: string;
  
  // Materials (optional)
  materials?: {
    shingles?: number;
    starter?: number;
    hipRidge?: number;
    underlayment?: number;
    nails?: number;
    dripEdge?: number;
    pipeBoots?: number;
    paint?: number;
    gooseNecks?: number;
  };
  
  // Company Info
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLicense?: string;
  
  // Dates
  proposalDate: Date;
  validUntil?: Date;
  
  // Signature
  customerSignature?: string; // Base64 data URL
  signatureDate?: Date;
}

export class PDFTemplateGenerator {
  private data: ProposalData;
  private config: TemplateConfig;
  private templateUrl: string;

  constructor(data: ProposalData) {
    this.data = data;
    
    // Get template configuration and URL from centralized config
    this.config = getTemplateConfig(data.dealType);
    this.templateUrl = getTemplateUrl(data.dealType);
  }

  /**
   * Generate PDF by filling template
   */
  async generate(): Promise<Buffer> {
    try {
      // Fetch template PDF
      const templateBytes = await this.fetchTemplate();
      
      // Load template into pdf-lib
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Get pages
      const pages = pdfDoc.getPages();
      
      // Fill in text fields
      await this.fillTextField(pages, 'customerName', this.data.customerName, helveticaBold);
      await this.fillTextField(pages, 'propertyAddress', this.data.propertyAddress, helveticaFont);
      await this.fillTextField(pages, 'cityStateZip', this.data.cityStateZip, helveticaFont);
      
      if (this.data.customerPhone) {
        await this.fillTextField(pages, 'customerPhone', this.data.customerPhone, helveticaFont);
      }
      
      if (this.data.customerEmail) {
        await this.fillTextField(pages, 'customerEmail', this.data.customerEmail, helveticaFont);
      }
      
      // Insurance-specific fields
      if (this.data.dealType === 'insurance') {
        if (this.data.insuranceCarrier) {
          await this.fillTextField(pages, 'insuranceCarrier', this.data.insuranceCarrier, helveticaFont);
        }
        if (this.data.claimNumber) {
          await this.fillTextField(pages, 'claimNumber', this.data.claimNumber, helveticaFont);
        }
      }
      
      // Pricing fields
      await this.fillTextField(pages, 'roofSquares', `${this.data.roofSquares.toFixed(1)} squares`, helveticaFont);
      await this.fillTextField(pages, 'pricePerSq', `$${this.data.pricePerSq.toFixed(2)}/sq`, helveticaFont);
      await this.fillTextField(pages, 'totalPrice', `$${this.data.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, helveticaBold);
      
      // Dates
      await this.fillTextField(pages, 'proposalDate', this.data.proposalDate.toLocaleDateString(), helveticaFont);
      
      if (this.data.validUntil) {
        await this.fillTextField(pages, 'validUntil', this.data.validUntil.toLocaleDateString(), helveticaFont);
      }
      
      // Signature
      if (this.data.customerSignature) {
        await this.embedSignature(pdfDoc, pages);
      }
      
      if (this.data.signatureDate) {
        await this.fillTextField(pages, 'signatureDate', this.data.signatureDate.toLocaleDateString(), helveticaFont);
      }
      
      // Save and return
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch template PDF from Supabase
   */
  private async fetchTemplate(): Promise<Uint8Array> {
    try {
      const response = await fetch(this.templateUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
      
    } catch (error) {
      console.error('Error fetching template:', error);
      
      // Fallback: Create a simple blank PDF if template not found
      console.warn('Template not found, creating blank PDF as fallback');
      return await this.createFallbackTemplate();
    }
  }

  /**
   * Create a simple fallback template if actual template is not available
   */
  private async createFallbackTemplate(): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    page.drawText('PROPOSAL DOCUMENT', {
      x: 50,
      y: 750,
      size: 24,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('(Template not configured - using fallback)', {
      x: 50,
      y: 720,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Add a second page for signatures
    pdfDoc.addPage([612, 792]);
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  /**
   * Fill a text field at configured coordinates
   */
  private async fillTextField(
    pages: any[],
    fieldName: string,
    value: string,
    font: any
  ): Promise<void> {
    const fieldConfig = this.config[fieldName];
    
    if (!fieldConfig) {
      console.warn(`No configuration found for field: ${fieldName}`);
      return;
    }
    
    const pageIndex = fieldConfig.page ?? 0;
    const page = pages[pageIndex];
    
    if (!page) {
      console.warn(`Page ${pageIndex} not found for field: ${fieldName}`);
      return;
    }
    
    page.drawText(value, {
      x: fieldConfig.x,
      y: fieldConfig.y,
      size: fieldConfig.size || 11,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: fieldConfig.maxWidth,
    });
  }

  /**
   * Embed signature image at configured coordinates
   */
  private async embedSignature(pdfDoc: PDFDocument, pages: any[]): Promise<void> {
    try {
      const signatureConfig = this.config['customerSignature'];
      
      if (!signatureConfig || !this.data.customerSignature) {
        return;
      }
      
      // Convert base64 data URL to buffer
      const base64Data = this.data.customerSignature.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Embed image (try PNG first, fallback to JPG)
      let image;
      try {
        image = await pdfDoc.embedPng(imageBuffer);
      } catch {
        try {
          image = await pdfDoc.embedJpg(imageBuffer);
        } catch (error) {
          console.error('Failed to embed signature image:', error);
          return;
        }
      }
      
      // Get page
      const pageIndex = signatureConfig.page ?? 0;
      const page = pages[pageIndex];
      
      if (!page) {
        console.warn(`Page ${pageIndex} not found for signature`);
        return;
      }
      
      // Scale signature to fit (max 200x60)
      const maxWidth = 200;
      const maxHeight = 60;
      const aspectRatio = image.width / image.height;
      
      let width = maxWidth;
      let height = maxWidth / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
      
      // Draw signature
      page.drawImage(image, {
        x: signatureConfig.x,
        y: signatureConfig.y,
        width: width,
        height: height,
      });
      
    } catch (error) {
      console.error('Error embedding signature:', error);
    }
  }
}

/**
 * Main export function
 */
export async function generateProposalPDF(data: ProposalData): Promise<Buffer> {
  const generator = new PDFTemplateGenerator(data);
  return generator.generate();
}
