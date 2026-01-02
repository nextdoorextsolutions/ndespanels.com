import PDFDocument from 'pdfkit';

interface InvoiceLineItem {
  description: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Company info (you can customize this)
    doc.fontSize(10).text('Next Door Exterior Solutions', { align: 'left' });
    doc.moveDown(0.5);

    // Invoice details
    doc.fontSize(12).text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });
    doc.fontSize(10).text(`Date: ${data.invoiceDate}`, { align: 'right' });
    doc.text(`Due Date: ${data.dueDate}`, { align: 'right' });
    doc.moveDown(2);

    // Bill to
    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10).text(data.clientName);
    if (data.clientAddress) doc.text(data.clientAddress);
    if (data.clientEmail) doc.text(data.clientEmail);
    if (data.clientPhone) doc.text(data.clientPhone);
    doc.moveDown(2);

    // Line items table
    const tableTop = doc.y;
    const descriptionX = 50;
    const quantityX = 300;
    const unitPriceX = 380;
    const totalX = 480;

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', descriptionX, tableTop);
    doc.text('Qty', quantityX, tableTop);
    doc.text('Unit Price', unitPriceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    doc.moveTo(descriptionX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    // Table rows
    doc.font('Helvetica');
    let yPosition = tableTop + 25;

    data.lineItems.forEach((item) => {
      doc.text(item.description, descriptionX, yPosition, { width: 240 });
      doc.text(item.quantity, quantityX, yPosition);
      doc.text(`$${(item.unitPrice / 100).toFixed(2)}`, unitPriceX, yPosition);
      doc.text(`$${(item.totalPrice / 100).toFixed(2)}`, totalX, yPosition);
      yPosition += 25;
    });

    // Totals
    yPosition += 10;
    doc.moveTo(descriptionX, yPosition)
       .lineTo(550, yPosition)
       .stroke();
    
    yPosition += 15;
    const totalsX = 420;
    
    doc.font('Helvetica');
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`$${data.subtotal.toFixed(2)}`, totalX, yPosition);
    
    yPosition += 20;
    doc.text('Tax:', totalsX, yPosition);
    doc.text(`$${data.taxAmount.toFixed(2)}`, totalX, yPosition);
    
    yPosition += 20;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total Due:', totalsX, yPosition);
    doc.text(`$${data.totalAmount.toFixed(2)}`, totalX, yPosition);

    // Notes
    if (data.notes) {
      yPosition += 40;
      doc.font('Helvetica').fontSize(10);
      doc.text('Notes:', descriptionX, yPosition);
      yPosition += 15;
      doc.text(data.notes, descriptionX, yPosition, { width: 500 });
    }

    // Footer
    doc.fontSize(8).text(
      'Thank you for your business!',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}
