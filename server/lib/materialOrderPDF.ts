// @ts-ignore - pdfkit types may not be available
import PDFDocument from 'pdfkit';

interface MaterialOrderData {
  jobAddress: string;
  orderDate: string;
  orderedBy: string;
  shingleSystem: string;
  shingleColor: string;
  wastePercent: number;
  calculatedItems: {
    shingleBundles: number;
    starterBundles: number;
    hipRidgeBundles: number;
    underlaymentRolls: number;
    iceWaterRolls: number;
    nailBoxes: number;
  };
  accessories: {
    dripEdge: number;
    pipeBoots: number;
    gooseNecks: number;
    sprayPaint: number;
  };
}

export async function generateMaterialOrderPDF(data: MaterialOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE ORDER REQUEST', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`Generated: ${data.orderDate}`, { align: 'center' });
    doc.moveDown(1.5);

    // Job Info Section
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Job Information');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Project Address: ${data.jobAddress}`);
    doc.text(`Ordered By: ${data.orderedBy}`);
    doc.text(`Shingle System: ${data.shingleSystem} - ${data.shingleColor}`);
    doc.text(`Waste Factor: ${data.wastePercent}%`);
    doc.moveDown(1.5);

    // Table Header
    doc.fontSize(12).font('Helvetica-Bold').text('Materials List');
    doc.moveDown(0.5);

    // Table setup
    const tableTop = doc.y;
    const col1X = 50;  // Quantity
    const col2X = 120; // Unit
    const col3X = 200; // Description

    // Draw table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('QUANTITY', col1X, tableTop);
    doc.text('UNIT', col2X, tableTop);
    doc.text('DESCRIPTION', col3X, tableTop);
    
    // Draw header line
    doc.moveTo(col1X, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let currentY = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    // Helper function to add a row
    const addRow = (qty: number, unit: string, description: string) => {
      if (qty > 0) {
        doc.text(qty.toString(), col1X, currentY);
        doc.text(unit, col2X, currentY);
        doc.text(description, col3X, currentY, { width: 300 });
        currentY += 20;
      }
    };

    // Calculated items
    addRow(
      data.calculatedItems.shingleBundles,
      'BDL',
      `${data.shingleSystem} Shingles - Color: ${data.shingleColor}`
    );
    
    addRow(
      data.calculatedItems.starterBundles,
      'BDL',
      'Starter Strip Shingles'
    );
    
    addRow(
      data.calculatedItems.hipRidgeBundles,
      'BDL',
      `Hip & Ridge Cap Shingles - Color: ${data.shingleColor}`
    );
    
    addRow(
      data.calculatedItems.underlaymentRolls,
      'ROLL',
      'Synthetic Underlayment (10 SQ per roll)'
    );
    
    addRow(
      data.calculatedItems.iceWaterRolls,
      'ROLL',
      'Ice & Water Shield (66 LF per roll)'
    );
    
    addRow(
      data.calculatedItems.nailBoxes,
      'BOX',
      '1-1/4" Coil Roofing Nails (7,200 count)'
    );

    // Manual accessories
    if (data.accessories.dripEdge > 0 || data.accessories.pipeBoots > 0 || 
        data.accessories.gooseNecks > 0 || data.accessories.sprayPaint > 0) {
      
      currentY += 10;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('ACCESSORIES', col1X, currentY);
      currentY += 20;
      doc.font('Helvetica').fontSize(9);
      
      addRow(data.accessories.dripEdge, 'PC', 'Drip Edge (10\' pieces)');
      addRow(data.accessories.pipeBoots, 'PC', 'Lead Pipe Boot (2.5#)');
      addRow(data.accessories.gooseNecks, 'PC', 'Goose Neck Vent (10" Galvanized)');
      addRow(data.accessories.sprayPaint, 'CAN', 'Spray Paint');
    }

    // Footer
    doc.moveDown(3);
    doc.fontSize(9).fillColor('#666666');
    doc.text('Please coordinate delivery with the project manager.', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('For questions, contact: ' + data.orderedBy, { align: 'center' });

    // Finalize PDF
    doc.end();
  });
}
