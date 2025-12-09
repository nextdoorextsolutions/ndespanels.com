# PDF Template System Documentation

## Overview

The PDF generation system has been upgraded to use **template filling** instead of drawing PDFs from scratch. This approach is:
- ✅ **Faster** - No need to draw every element
- ✅ **Easier to maintain** - Update templates in design software
- ✅ **More professional** - Use professionally designed PDFs
- ✅ **Flexible** - Easy to adjust field positions

---

## How It Works

### **Old System (pdfkit):**
```typescript
// Draw everything from scratch
doc.text('Customer Name:', 50, 700);
doc.text(customerName, 150, 700);
doc.rect(50, 650, 500, 100);
// ... hundreds of lines of drawing code
```

### **New System (pdf-lib):**
```typescript
// 1. Load pre-designed template PDF
const pdfDoc = await PDFDocument.load(templateBytes);

// 2. Fill in the blanks
page.drawText(customerName, { x: 100, y: 680 });
page.drawImage(signature, { x: 80, y: 200 });

// Done!
```

---

## Architecture

### **Files:**

```
server/lib/
├── pdfTemplateConfig.ts      ← Coordinate mappings (EDIT THIS)
├── pdfTemplateGenerator.ts   ← PDF filling logic
└── README_PDF_TEMPLATES.md   ← This file
```

### **Flow:**

```
1. User clicks "Generate Contract"
   ↓
2. Server determines deal type (insurance/cash/financed)
   ↓
3. Fetch corresponding template from Supabase
   ↓
4. Load template with pdf-lib
   ↓
5. Fill in fields at configured coordinates
   ↓
6. Embed customer signature image
   ↓
7. Return completed PDF
```

---

## Setup Instructions

### **Step 1: Create Template PDFs**

Use any design software (Adobe InDesign, Canva, Word, etc.) to create your templates:

**Insurance Template (`contingency_agreement.pdf`):**
- Page 1: Contingency Agreement
  - Customer information section
  - Insurance carrier & claim number
  - Pricing details
  - Terms & conditions
- Page 2: Letter of Authorization
  - Authorization text
  - Signature lines

**Cash Template (`cash_contract.pdf`):**
- Page 1: Proposal Details
  - Customer information
  - Proposal dates
  - Pricing breakdown
  - Payment schedule (10% / 40% / 50%)
- Page 2: Terms & Signatures
  - Warranty information
  - Terms & conditions
  - Signature lines

**Financed Template (`financed_contract.pdf`):**
- Same as cash template but with financing terms
- 0% APR options
- 12-120 month terms
- No prepayment penalties

**Design Tips:**
- Leave blank spaces for dynamic fields
- Use placeholder text to mark field locations
- Keep signature areas clear
- Use standard letter size (8.5" x 11")
- Export as PDF

---

### **Step 2: Upload Templates to Supabase**

1. **Create Storage Bucket:**
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('templates', 'templates', true);
   ```

2. **Set RLS Policies:**
   ```sql
   -- Allow public read access to templates
   CREATE POLICY "Templates are publicly accessible"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'templates');
   ```

3. **Upload PDFs:**
   - Go to Supabase Dashboard → Storage → templates
   - Upload your three template PDFs:
     - `contingency_agreement.pdf`
     - `cash_contract.pdf`
     - `financed_contract.pdf`

4. **Get Public URLs:**
   - Click on each file
   - Copy the public URL
   - Should look like:
     ```
     https://[project].supabase.co/storage/v1/object/public/templates/contingency_agreement.pdf
     ```

---

### **Step 3: Configure Template URLs**

**Option A: Environment Variables (Recommended)**

Add to your `.env` file:
```env
INSURANCE_TEMPLATE_URL=https://your-project.supabase.co/storage/v1/object/public/templates/contingency_agreement.pdf
CASH_TEMPLATE_URL=https://your-project.supabase.co/storage/v1/object/public/templates/cash_contract.pdf
FINANCED_TEMPLATE_URL=https://your-project.supabase.co/storage/v1/object/public/templates/financed_contract.pdf
```

**Option B: Direct Edit**

Edit `server/lib/pdfTemplateConfig.ts`:
```typescript
export const TEMPLATE_URLS = {
  insurance: 'https://your-actual-url.com/contingency_agreement.pdf',
  cash: 'https://your-actual-url.com/cash_contract.pdf',
  financed: 'https://your-actual-url.com/financed_contract.pdf',
};
```

---

### **Step 4: Configure Field Coordinates**

This is the most important step! You need to tell the system where to place text on your templates.

**Understanding Coordinates:**

PDF coordinates start from the **BOTTOM-LEFT** corner:
```
(0, 792) ─────────────────── (612, 792)  ← Top of page
   │                              │
   │                              │
   │        Your Content          │
   │                              │
   │                              │
(0, 0) ───────────────────── (612, 0)    ← Bottom of page
```

- **X**: Distance from left edge (0-612 for letter size)
- **Y**: Distance from bottom edge (0-792 for letter size)
- **Units**: Points (72 points = 1 inch)

**Finding Coordinates:**

**Method 1: Adobe Acrobat (Best)**
1. Open template PDF in Adobe Acrobat
2. Tools → Measure → Distance
3. Click on bottom-left corner, then click where you want text
4. Note the X and Y values

**Method 2: Trial and Error**
1. Start with estimated coordinates
2. Generate a test PDF
3. Adjust coordinates up/down/left/right
4. Repeat until perfect

**Method 3: Design Software**
1. If you designed the template, note element positions
2. Convert to points (multiply inches by 72)
3. Remember to flip Y coordinate (measure from bottom)

**Helper Functions:**

```typescript
import { yFromTop, inchesToPoints } from './pdfTemplateConfig';

// If your design tool shows:
// X: 1.5 inches from left
// Y: 2 inches from top

const config = {
  x: inchesToPoints(1.5),           // = 108 points
  y: yFromTop(inchesToPoints(2)),   // = 648 points (from bottom)
};
```

---

### **Step 5: Edit Configuration File**

Open `server/lib/pdfTemplateConfig.ts` and adjust coordinates:

```typescript
export const INSURANCE_CONFIG: TemplateConfig = {
  customerName: {
    x: 100,      // ← Adjust horizontal position
    y: 680,      // ← Adjust vertical position
    size: 12,    // ← Font size
    page: 0,     // ← Page number (0 = first page)
  },
  
  propertyAddress: {
    x: 100,
    y: 655,
    size: 11,
    maxWidth: 400,  // ← Optional: wrap text if too long
    page: 0,
  },
  
  // ... more fields
};
```

**Available Fields:**

**All Templates:**
- `customerName`
- `propertyAddress`
- `cityStateZip`
- `customerPhone`
- `customerEmail`
- `roofSquares`
- `pricePerSq`
- `totalPrice`
- `proposalDate`
- `customerSignature` (image, not text)
- `signatureDate`

**Insurance Only:**
- `insuranceCarrier`
- `claimNumber`

**Cash/Financed Only:**
- `validUntil`

---

## Testing

### **Test 1: Verify Template Loading**

```typescript
// In server console or test file
import { getTemplateUrl } from './lib/pdfTemplateConfig';

console.log(getTemplateUrl('insurance'));
// Should print your Supabase URL

// Try fetching it
const response = await fetch(getTemplateUrl('insurance'));
console.log(response.ok); // Should be true
```

### **Test 2: Generate Test PDF**

1. Create a test job with approved pricing
2. Click "Generate Contract"
3. Check if PDF preview loads
4. Verify all fields appear in correct positions
5. Adjust coordinates in `pdfTemplateConfig.ts` if needed
6. Repeat until perfect

### **Test 3: Test Signature Embedding**

1. Complete signature on canvas
2. Click "Accept & Sign"
3. Download signed PDF
4. Verify signature appears at correct position
5. Verify signature is clear and properly sized

---

## Customization

### **Adjusting Text Position**

If text appears in the wrong place:

1. Open `server/lib/pdfTemplateConfig.ts`
2. Find the field configuration
3. Adjust `x` and `y` values:
   - Increase `x` to move right
   - Decrease `x` to move left
   - Increase `y` to move up
   - Decrease `y` to move down
4. Save file
5. Restart server
6. Test again

### **Changing Font Size**

```typescript
customerName: {
  x: 100,
  y: 680,
  size: 14,  // ← Make larger
  page: 0,
},
```

### **Adding Text Wrapping**

```typescript
propertyAddress: {
  x: 100,
  y: 655,
  size: 11,
  maxWidth: 400,  // ← Wrap if longer than 400 points
  page: 0,
},
```

### **Moving to Different Page**

```typescript
customerSignature: {
  x: 80,
  y: 200,
  page: 1,  // ← 0 = first page, 1 = second page, etc.
},
```

---

## Signature Handling

Signatures are handled differently than text:

```typescript
customerSignature: {
  x: 80,       // Left edge of signature
  y: 200,      // Bottom edge of signature
  page: 1,     // Usually on second page
  // No 'size' - auto-scaled to max 200x60
},
```

**Signature Scaling:**
- Maximum width: 200 points
- Maximum height: 60 points
- Maintains aspect ratio
- Centered on signature line

**Adjusting Signature Position:**
1. Find signature line on your template
2. Measure from bottom-left corner
3. Set `x` to left edge of signature area
4. Set `y` to bottom edge (slightly above line)

---

## Troubleshooting

### **Problem: Template Not Found**

**Error:** `Failed to fetch template: 404`

**Solutions:**
1. Verify template URL is correct
2. Check Supabase storage bucket is public
3. Verify file name matches exactly
4. Try accessing URL directly in browser

### **Problem: Text in Wrong Position**

**Solutions:**
1. Remember Y is from BOTTOM, not top
2. Use `yFromTop()` helper if measuring from top
3. Check page number is correct (0-indexed)
4. Verify template hasn't changed

### **Problem: Text Too Large/Small**

**Solutions:**
1. Adjust `size` property in config
2. Standard sizes: 10-12 for body, 14-18 for headers
3. Test with different values

### **Problem: Signature Not Appearing**

**Solutions:**
1. Verify signature is base64 PNG format
2. Check coordinates are on correct page
3. Ensure Y coordinate isn't off-page
4. Check browser console for errors

### **Problem: Text Overlapping**

**Solutions:**
1. Increase spacing between fields
2. Add `maxWidth` to wrap long text
3. Reduce font size
4. Redesign template with more space

---

## Advanced Features

### **Multi-Page Templates**

```typescript
// Page 1 fields
customerName: { x: 100, y: 680, page: 0 },

// Page 2 fields
customerSignature: { x: 80, y: 200, page: 1 },

// Page 3 fields (if you have them)
additionalTerms: { x: 50, y: 700, page: 2 },
```

### **Conditional Fields**

Some fields only appear for certain deal types:

```typescript
// In pdfTemplateGenerator.ts
if (this.data.dealType === 'insurance') {
  await this.fillTextField(pages, 'insuranceCarrier', this.data.insuranceCarrier, font);
  await this.fillTextField(pages, 'claimNumber', this.data.claimNumber, font);
}
```

### **Custom Formatting**

```typescript
// In pdfTemplateGenerator.ts

// Currency formatting
await this.fillTextField(
  pages,
  'totalPrice',
  `$${this.data.totalPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`,
  helveticaBold
);

// Date formatting
await this.fillTextField(
  pages,
  'proposalDate',
  this.data.proposalDate.toLocaleDateString('en-US'),
  helveticaFont
);
```

---

## Migration from Old System

If you were using the old pdfkit-based system:

1. ✅ pdf-lib is already installed
2. ✅ Server code already updated to use new generator
3. ✅ Create your template PDFs
4. ✅ Upload to Supabase
5. ✅ Configure URLs
6. ✅ Adjust coordinates
7. ✅ Test thoroughly
8. ✅ Deploy

**Fallback Behavior:**

If templates aren't found, the system creates a simple blank PDF with a warning message. This prevents errors while you're setting up templates.

---

## Best Practices

### **Template Design:**
- ✅ Use professional design software
- ✅ Keep consistent margins (0.5-1 inch)
- ✅ Leave clear space for dynamic fields
- ✅ Use placeholder text during design
- ✅ Test print before finalizing

### **Coordinate Configuration:**
- ✅ Document your coordinate system
- ✅ Use consistent spacing
- ✅ Group related fields
- ✅ Comment complex positioning
- ✅ Keep backup of working configs

### **Testing:**
- ✅ Test all three deal types
- ✅ Test with long customer names
- ✅ Test with long addresses
- ✅ Test signature positioning
- ✅ Print test PDFs

---

## Support

### **Quick Reference:**

| Task | File to Edit |
|------|-------------|
| Change field positions | `pdfTemplateConfig.ts` |
| Update template URLs | `pdfTemplateConfig.ts` or `.env` |
| Add new fields | `pdfTemplateConfig.ts` + `pdfTemplateGenerator.ts` |
| Change template design | Upload new PDF to Supabase |
| Debug coordinate issues | Use `yFromTop()` and `inchesToPoints()` |

### **Common Coordinates:**

```typescript
// Top-left area (header)
{ x: 50, y: 750 }

// Center-top
{ x: 306, y: 750 }  // 306 = 612/2 (page width / 2)

// Bottom signature area
{ x: 80, y: 200 }

// Full width text
{ x: 50, y: 400, maxWidth: 512 }  // 512 = 612 - 100 (margins)
```

---

## Example: Complete Setup

```typescript
// 1. Upload templates to Supabase
// 2. Add to .env:
INSURANCE_TEMPLATE_URL=https://xyz.supabase.co/storage/v1/object/public/templates/contingency_agreement.pdf

// 3. Configure coordinates in pdfTemplateConfig.ts:
export const INSURANCE_CONFIG: TemplateConfig = {
  customerName: { x: 100, y: 680, size: 12, page: 0 },
  totalPrice: { x: 100, y: 405, size: 14, page: 0 },
  customerSignature: { x: 80, y: 200, page: 1 },
};

// 4. Test:
// - Create job
// - Approve pricing
// - Generate contract
// - Sign
// - Verify PDF

// 5. Adjust coordinates as needed
// 6. Deploy!
```

---

**✅ You're all set! The template-based PDF system is ready to use.**
