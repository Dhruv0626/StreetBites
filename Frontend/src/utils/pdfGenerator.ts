/**
 * StreetBites Client-Side PDF Generator
 * Generates official, standard-compliant PDF 1.4 documents for Vendor & Rider registrations.
 * Zero external npm dependencies — runs natively in any modern browser.
 */

// Helper to escape characters for PDF text operators
export const escapePdfText = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/₹/g, 'Rs. ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
};

/**
 * Pure TypeScript PDF Builder producing standard ISO 32000-1 compatible PDF 1.4
 */
export class SimplePdfDocument {
  private streamCommands: string[] = [];
  public pageWidth = 595.28; // A4 Width in points
  public pageHeight = 841.89; // A4 Height in points

  // Draw filled rectangle
  fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
    this.streamCommands.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`
    );
  }

  // Draw outlined rectangle
  strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, lineWidth = 1) {
    this.streamCommands.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n${lineWidth} w\n${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`
    );
  }

  // Draw a straight line
  drawLine(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, lineWidth = 1) {
    this.streamCommands.push(
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n${lineWidth} w\n${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`
    );
  }

  // Draw text with absolute coordinates (font: /F1 = Helvetica, /F2 = Helvetica-Bold, /F3 = Helvetica-Oblique)
  drawText(
    text: string,
    x: number,
    y: number,
    fontSize = 10,
    font = 'F1',
    r = 0.1,
    g = 0.1,
    b = 0.1
  ) {
    const escaped = escapePdfText(text);
    this.streamCommands.push(
      `BT\n/${font} ${fontSize} Tf\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm\n(${escaped}) Tj\nET\n`
    );
  }

  // Draw a 2-column key-value field
  drawField(
    label: string,
    value: string,
    x: number,
    y: number,
    labelWidth = 100,
    valueWidth = 140
  ) {
    this.drawText(label, x, y, 8.5, 'F2', 0.4, 0.4, 0.4);
    this.drawText(value || 'N/A', x + labelWidth, y, 9, 'F1', 0.1, 0.1, 0.1);
  }

  // Draw filled circle using cubic Bezier curves
  fillCircle(cx: number, cy: number, r: number, red: number, green: number, blue: number) {
    const k = 0.5522847498 * r;
    this.streamCommands.push(
      `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)} rg\n` +
      `${cx.toFixed(2)} ${(cy + r).toFixed(2)} m\n` +
      `${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c\n` +
      `${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c\n` +
      `${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c\n` +
      `${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c\n` +
      `f\n`
    );
  }

  // Draw stroked circle
  strokeCircle(cx: number, cy: number, r: number, red: number, green: number, blue: number, lineWidth = 1) {
    const k = 0.5522847498 * r;
    this.streamCommands.push(
      `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)} RG\n${lineWidth} w\n` +
      `${cx.toFixed(2)} ${(cy + r).toFixed(2)} m\n` +
      `${(cx + k).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c\n` +
      `${(cx + r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx + k).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c\n` +
      `${(cx - k).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy - k).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c\n` +
      `${(cx - r).toFixed(2)} ${(cy + k).toFixed(2)} ${(cx - k).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c\n` +
      `S\n`
    );
  }

  // Draw centered text
  drawTextCentered(
    text: string,
    cx: number,
    y: number,
    fontSize = 10,
    font = 'F1',
    r = 0.1,
    g = 0.1,
    b = 0.1
  ) {
    const approxWidth = text.length * fontSize * (font === 'F2' ? 0.58 : 0.52);
    const x = cx - approxWidth / 2;
    this.drawText(text, x, y, fontSize, font, r, g, b);
  }

  // Draw official StreetBites Brand Symbol (Pin + 3-Prong Fork Nodes)
  drawBrandSymbol(x: number, y: number, w = 24, h = 34) {
    const cx = x + w / 2;
    const basePinY = y + 2;

    // 1. Red location pin body with tapered bottom point
    const pinR = 6.5;
    const pinCenterY = basePinY + 9.5;
    const k = 0.5522847498 * pinR;

    this.streamCommands.push(
      `0.898 0.294 0.235 rg\n` +
      `${cx.toFixed(2)} ${basePinY.toFixed(2)} m\n` +
      `${(cx - 6.2).toFixed(2)} ${(pinCenterY - 1.5).toFixed(2)} l\n` +
      `${(cx - 6.5).toFixed(2)} ${(pinCenterY + k).toFixed(2)} ${(cx - k).toFixed(2)} ${(pinCenterY + pinR).toFixed(2)} ${cx.toFixed(2)} ${(pinCenterY + pinR).toFixed(2)} c\n` +
      `${(cx + k).toFixed(2)} ${(pinCenterY + pinR).toFixed(2)} ${(cx + 6.5).toFixed(2)} ${(pinCenterY + k).toFixed(2)} ${(cx + 6.2).toFixed(2)} ${(pinCenterY - 1.5).toFixed(2)} c\n` +
      `${cx.toFixed(2)} ${basePinY.toFixed(2)} l\n` +
      `f\n`
    );

    // 2. White bite-mark dot on upper right of pin
    this.fillCircle(cx + 4.6, pinCenterY + 1.5, 1.8, 0.11, 0.10, 0.09);

    // 3. White 3-prong fork stems
    this.drawLine(cx, pinCenterY + 5, cx, y + h - 5, 1, 1, 1, 1.6);
    this.drawLine(cx, pinCenterY + 6, cx - 7.5, y + h - 7, 1, 1, 1, 1.6);
    this.drawLine(cx, pinCenterY + 6, cx + 7.5, y + h - 7, 1, 1, 1, 1.6);

    // 4. White node spheres at the tips of the 3 prongs
    this.fillCircle(cx, y + h - 5, 2.2, 1, 1, 1);
    this.fillCircle(cx - 7.5, y + h - 7, 2.2, 1, 1, 1);
    this.fillCircle(cx + 7.5, y + h - 7, 2.2, 1, 1, 1);
  }

  // Draw official Rubber Stamp for Onboarding Authority
  drawAuthorityStamp(cx: number, cy: number) {
    const stampRed = 0.78;
    const stampGreen = 0.15;
    const stampBlue = 0.12;

    // Outer double rings
    this.strokeCircle(cx, cy, 36, stampRed, stampGreen, stampBlue, 1.6);
    this.strokeCircle(cx, cy, 33, stampRed, stampGreen, stampBlue, 0.7);
    this.strokeCircle(cx, cy, 25, stampRed, stampGreen, stampBlue, 0.5);

    // Stamp text inside ring
    this.drawTextCentered('STREETBITES ONBOARDING', cx, cy + 18, 5.2, 'F2', stampRed, stampGreen, stampBlue);
    this.drawTextCentered('AUTHORITY * AHMEDABAD', cx, cy + 11.5, 4.8, 'F2', stampRed, stampGreen, stampBlue);

    // Central Verification Ribbon / Box
    this.fillRect(cx - 28, cy - 6, 56, 12, 1, 0.96, 0.95);
    this.strokeRect(cx - 28, cy - 6, 56, 12, stampRed, stampGreen, stampBlue, 0.9);
    this.drawTextCentered('* VERIFIED DRAFT *', cx, cy - 2.5, 6, 'F2', stampRed, stampGreen, stampBlue);

    // Bottom Stamp Details
    this.drawTextCentered('OPERATIONS & KYC WING', cx, cy - 13, 4.8, 'F2', stampRed, stampGreen, stampBlue);
    this.drawTextCentered('OFFICIAL SEAL & SIGN', cx, cy - 19.5, 4.2, 'F1', stampRed, stampGreen, stampBlue);

    // Digital signature flourish across the stamp (authentic fluid path in navy ink)
    this.streamCommands.push(
      `0.12 0.22 0.48 RG\n1.2 w\n` +
      `${(cx - 22).toFixed(2)} ${(cy - 4).toFixed(2)} m\n` +
      `${(cx - 14).toFixed(2)} ${(cy + 9).toFixed(2)} ${(cx - 7).toFixed(2)} ${(cy + 15).toFixed(2)} ${(cx - 1).toFixed(2)} ${(cy + 4).toFixed(2)} c\n` +
      `${(cx + 6).toFixed(2)} ${(cy - 7).toFixed(2)} ${(cx + 14).toFixed(2)} ${(cy + 7).toFixed(2)} ${(cx + 22).toFixed(2)} ${(cy - 2).toFixed(2)} c\n` +
      `${(cx + 26).toFixed(2)} ${(cy - 5).toFixed(2)} l\n` +
      `S\n`
    );
  }

  // Compile full PDF binary string
  compile(): string {
    const contentStream = this.streamCommands.join('');
    const streamLength = contentStream.length;

    const objects: string[] = [
      // 1: Catalog
      `<< /Type /Catalog /Pages 2 0 R >>`,
      // 2: Pages
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      // 3: Page
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`,
      // 4: Stream Content
      `<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`,
      // 5: Font Helvetica
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
      // 6: Font Helvetica-Bold
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
      // 7: Font Helvetica-Oblique
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`,
    ];

    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [0];

    for (let i = 0; i < objects.length; i++) {
      offsets.push(output.length);
      output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const startXref = output.length;
    output += `xref\n0 ${objects.length + 1}\n`;
    output += '0000000000 65535 f \n';

    for (let i = 1; i <= objects.length; i++) {
      const offStr = String(offsets[i]).padStart(10, '0');
      output += `${offStr} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return output;
  }

  // Trigger immediate browser download
  download(filename: string) {
    const rawPdf = this.compile();
    const blob = new Blob([rawPdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export interface VendorPdfData {
  ownerName: string;
  email: string;
  phone: string;
  stallName: string;
  stall_category: string;
  establishedYear: string;
  description: string;
  openTill: string;
  cluster: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  hasAadhaar: boolean;
  hasFssai: boolean;
  hasPan: boolean;
  hasStallPhoto: boolean;
}

export interface RiderPdfData {
  name: string;
  email: string;
  phone: string;
  vehicleModel: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  hasAadhaar: boolean;
  hasLicense: boolean;
  hasVehiclePhoto: boolean;
  hasNumberPlatePhoto: boolean;
}

/**
 * Generates and downloads an official Vendor Registration Draft Copy PDF
 */
export const downloadVendorRegistrationPdf = (data: VendorPdfData): void => {
  const doc = new SimplePdfDocument();
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const appId = `SB-VEND-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Top Header Banner (StreetBites Dark Slate with Orange Accent)
  doc.fillRect(36, 744, 523, 64, 0.11, 0.10, 0.09); // #1C1917
  doc.fillRect(36, 741, 523, 3, 0.85, 0.29, 0.22); // #D94A38

  // Official StreetBites Brand Symbol (Pin + 3-Prong Nodes)
  doc.drawBrandSymbol(48, 755, 24, 34);

  // Brand Title with Styled Accent
  doc.drawText('STREET', 80, 782, 19, 'F2', 1, 1, 1);
  doc.drawText('BITES', 156, 782, 19, 'F2', 0.90, 0.32, 0.24);
  doc.drawText('HYPERLOCAL KHAU GALLI FOOD DELIVERY PLATFORM', 80, 768, 7, 'F1', 0.8, 0.8, 0.8);
  doc.drawText('VENDOR ONBOARDING APPLICATION (DRAFT COPY)', 80, 755, 7.5, 'F3', 0.95, 0.6, 0.5);

  doc.drawText('APPLICANT COPY', 370, 782, 11, 'F2', 0.95, 0.45, 0.35);
  doc.drawText(`Application ID: ${appId}`, 370, 768, 8.5, 'F1', 1, 1, 1);
  doc.drawText(`Submitted: ${dateStr}`, 370, 755, 8, 'F1', 0.8, 0.8, 0.8);

  // 2. Status Banner (Cream Background with Amber Alert)
  doc.fillRect(36, 698, 523, 36, 0.99, 0.97, 0.94);
  doc.strokeRect(36, 698, 523, 36, 0.92, 0.88, 0.82, 1);
  doc.drawText('APPLICATION STATUS: AWAITING ADMIN DOCUMENT VERIFICATION', 48, 719, 8.5, 'F2', 0.65, 0.35, 0.1);
  doc.drawText(
    'This draft receipt documents the full data submitted during your registration. Keep this file for your records.',
    48,
    707,
    7.5,
    'F1',
    0.4,
    0.35,
    0.3
  );

  // Helper for section headings
  const drawSectionHeader = (title: string, y: number) => {
    doc.fillRect(36, y - 4, 523, 18, 0.95, 0.94, 0.92);
    doc.fillRect(36, y - 4, 4, 18, 0.85, 0.29, 0.22);
    doc.drawText(title, 48, y, 9, 'F2', 0.15, 0.15, 0.15);
  };

  // 3. Section 1: Vendor & Stall Information
  let curY = 672;
  drawSectionHeader('1. VENDOR PROFILE & STALL DETAILS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Owner / Vendor Name:', data.ownerName, 48, curY, 110, 140);
  doc.drawField('Registered Phone:', data.phone, 300, curY, 95, 140);

  curY -= 18;
  doc.drawField('Email Address:', data.email, 48, curY, 110, 140);
  doc.drawField('Khau Galli:', data.cluster || 'Ahmedabad Khau Galli', 300, curY, 95, 140);

  curY -= 18;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Stall Name:', data.stallName, 48, curY, 110, 140);
  doc.drawField('Stall Category:', data.stall_category || 'Fast Food & Dosa', 300, curY, 95, 140);

  curY -= 18;
  doc.drawField('Operating Since:', data.establishedYear || '1998', 48, curY, 110, 140);
  doc.drawField('Open Till (Timing):', data.openTill || '02:00 AM', 300, curY, 95, 140);

  curY -= 18;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Stall Specialties:', data.description || 'Authentic Street Food Specialities', 48, curY, 110, 360);

  // 4. Section 2: KYC & Mandatory Documents Checklist
  curY -= 28;
  drawSectionHeader('2. MANDATORY KYC COMPLIANCE & DOCUMENTS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Storefront Photo:', data.hasStallPhoto ? 'Uploaded & Cloudinary Verified' : 'Uploaded', 48, curY, 130, 120);
  doc.drawField('Aadhaar Identification:', data.hasAadhaar ? 'Uploaded & Securely Stored' : 'Not Attached', 300, curY, 130, 120);

  curY -= 18;
  doc.drawField('FSSAI Food License:', data.hasFssai ? 'Uploaded & Cloudinary Verified' : 'Exempted / Pending', 48, curY, 130, 120);
  doc.drawField('PAN Card Document:', data.hasPan ? 'Uploaded & Securely Stored' : 'Exempted / Pending', 300, curY, 130, 120);

  // 5. Section 3: Settlement & Banking Information
  curY -= 28;
  drawSectionHeader('3. BANKING & DIRECT EARNINGS PAYOUT DETAILS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Beneficiary Bank:', data.bankName, 48, curY, 110, 140);
  doc.drawField('Bank Account Number:', data.accountNumber, 300, curY, 110, 140);

  curY -= 18;
  doc.drawField('IFSC Code:', data.ifscCode, 48, curY, 110, 140);
  doc.drawField('UPI ID for Payouts:', data.upiId || 'Not provided', 300, curY, 110, 140);

  curY -= 18;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Platform Fee Structure:', '95% Vendor Net (5% platform commission)', 48, curY, 130, 340);

  // 6. Section 4: Food Item Logic & Visibility Rules
  curY -= 28;
  drawSectionHeader('4. FOOD ITEM RULES & PLATFORM VISIBILITY', curY);

  curY -= 18;
  doc.drawText('* Stall Menu Integration:', 48, curY, 8, 'F2', 0.2, 0.2, 0.2);
  doc.drawText(
    'Dishes with status "Review_pending" appear immediately in your stall menu for customers to view.',
    160,
    curY,
    8,
    'F1',
    0.3,
    0.3,
    0.3
  );

  curY -= 14;
  doc.drawText('* Home Page Discovery:', 48, curY, 8, 'F2', 0.2, 0.2, 0.2);
  doc.drawText(
    'Dishes are published to "What\'s on your mind?" on the main Home page once approved by Admin.',
    160,
    curY,
    8,
    'F1',
    0.3,
    0.3,
    0.3
  );

  // 7. Declaration & Sign-off Box
  curY -= 28;
  doc.fillRect(36, curY - 34, 523, 44, 0.96, 0.98, 0.96);
  doc.strokeRect(36, curY - 34, 523, 44, 0.85, 0.92, 0.85, 1);
  doc.drawText('APPLICANT DIGITAL DECLARATION', 48, curY + 2, 8, 'F2', 0.1, 0.45, 0.2);
  doc.drawText(
    'I hereby confirm that all information, business details, and KYC documents provided above are truthful and accurate.',
    48,
    curY - 10,
    7.5,
    'F1',
    0.2,
    0.35,
    0.2
  );
  doc.drawText(
    'Digitally generated upon successful online submission on StreetBites Partner Portal.',
    48,
    curY - 22,
    7.5,
    'F3',
    0.4,
    0.4,
    0.4
  );

  // 8. Official Signatures & Onboarding Authority Stamp Block
  curY -= 65;

  // Applicant Digital Signature (Left)
  doc.drawText(data.ownerName, 52, curY + 8, 12, 'F3', 0.12, 0.22, 0.48);
  doc.drawText('[Digitally Authenticated Applicant Copy]', 52, curY + 22, 6.5, 'F3', 0.45, 0.45, 0.45);
  doc.drawLine(48, curY, 220, curY, 0.7, 0.7, 0.7, 0.8);
  doc.drawText('Applicant Signature (Authenticated)', 48, curY - 12, 7.5, 'F2', 0.4, 0.4, 0.4);
  doc.drawText(data.ownerName, 48, curY - 22, 8.5, 'F1', 0.1, 0.1, 0.1);

  // Authority Rubber Stamp & Signature (Right)
  doc.drawAuthorityStamp(435, curY + 28);
  doc.drawLine(350, curY, 520, curY, 0.7, 0.7, 0.7, 0.8);
  doc.drawText('StreetBites Onboarding Authority', 350, curY - 12, 7.5, 'F2', 0.4, 0.4, 0.4);
  doc.drawText('Operations & KYC Verification Wing (Ahmedabad)', 350, curY - 22, 8, 'F1', 0.1, 0.1, 0.1);

  // 9. Footer
  doc.drawLine(36, 42, 559, 42, 0.85, 0.85, 0.85, 0.8);
  doc.drawText(
    'StreetBites Hyperlocal Network Pvt. Ltd. · support@streetbites.com · Confidential Applicant Copy · Page 1 of 1',
    50,
    30,
    7,
    'F1',
    0.5,
    0.5,
    0.5
  );

  const cleanName = data.ownerName.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Vendor';
  doc.download(`StreetBites_Vendor_Application_${cleanName}.pdf`);
};

/**
 * Generates and downloads an official Rider Registration Draft Copy PDF
 */
export const downloadRiderRegistrationPdf = (data: RiderPdfData): void => {
  const doc = new SimplePdfDocument();
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const appId = `SB-RIDER-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Top Header Banner (StreetBites Dark Slate with Orange Accent)
  doc.fillRect(36, 744, 523, 64, 0.11, 0.10, 0.09);
  doc.fillRect(36, 741, 523, 3, 0.85, 0.29, 0.22);

  // Official StreetBites Brand Symbol (Pin + 3-Prong Nodes)
  doc.drawBrandSymbol(48, 755, 24, 34);

  // Brand Title with Styled Accent
  doc.drawText('STREET', 80, 782, 19, 'F2', 1, 1, 1);
  doc.drawText('BITES', 156, 782, 19, 'F2', 0.90, 0.32, 0.24);
  doc.drawText('HYPERLOCAL DELIVERY RIDER ONBOARDING NETWORK', 80, 768, 7, 'F1', 0.8, 0.8, 0.8);
  doc.drawText('DELIVERY PARTNER APPLICATION (DRAFT COPY)', 80, 755, 7.5, 'F3', 0.95, 0.6, 0.5);

  doc.drawText('RIDER COPY', 380, 782, 11, 'F2', 0.95, 0.45, 0.35);
  doc.drawText(`Rider ID: ${appId}`, 380, 768, 8.5, 'F1', 1, 1, 1);
  doc.drawText(`Submitted: ${dateStr}`, 380, 755, 8, 'F1', 0.8, 0.8, 0.8);

  // 2. Status Banner
  doc.fillRect(36, 698, 523, 36, 0.99, 0.97, 0.94);
  doc.strokeRect(36, 698, 523, 36, 0.92, 0.88, 0.82, 1);
  doc.drawText('APPLICATION STATUS: PENDING VERIFICATION & RIDER DISPATCH ALLOCATION', 48, 719, 8.5, 'F2', 0.65, 0.35, 0.1);
  doc.drawText(
    'Your rider partner registration has been recorded and documents uploaded for inspection. Keep this receipt.',
    48,
    707,
    7.5,
    'F1',
    0.4,
    0.35,
    0.3
  );

  const drawSectionHeader = (title: string, y: number) => {
    doc.fillRect(36, y - 4, 523, 18, 0.95, 0.94, 0.92);
    doc.fillRect(36, y - 4, 4, 18, 0.85, 0.29, 0.22);
    doc.drawText(title, 48, y, 9, 'F2', 0.15, 0.15, 0.15);
  };

  // 3. Section 1: Rider Profile & Vehicle Information
  let curY = 672;
  drawSectionHeader('1. DELIVERY RIDER PERSONAL & VEHICLE DETAILS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Full Name:', data.name, 48, curY, 110, 140);
  doc.drawField('Contact Phone:', data.phone, 300, curY, 110, 140);

  curY -= 18;
  doc.drawField('Email Address:', data.email, 48, curY, 110, 140);
  doc.drawField('Operating City:', 'Ahmedabad, Gujarat', 300, curY, 110, 140);

  curY -= 18;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Vehicle Make / Model:', data.vehicleModel || 'Motorcycle / Scooter', 48, curY, 110, 140);
  doc.drawField('Dispatch Role:', 'Hyperlocal Khau Galli Delivery Partner', 300, curY, 110, 140);

  // 4. Section 2: KYC & License Documents Checklist
  curY -= 28;
  drawSectionHeader('2. DRIVER KYC & VEHICLE VERIFICATION DOCUMENTS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Driving License:', data.hasLicense ? 'Uploaded & Cloudinary Verified' : 'Uploaded', 48, curY, 130, 120);
  doc.drawField('Aadhaar ID Proof:', data.hasAadhaar ? 'Uploaded & Securely Stored' : 'Uploaded', 300, curY, 130, 120);

  curY -= 18;
  doc.drawField('Vehicle Photo:', data.hasVehiclePhoto ? 'Uploaded & Cloudinary Verified' : 'Uploaded', 48, curY, 130, 120);
  doc.drawField('Number Plate Photo:', data.hasNumberPlatePhoto ? 'Uploaded & Cloudinary Verified' : 'Uploaded', 300, curY, 130, 120);

  // 5. Section 3: Banking & Rider Payout Details
  curY -= 28;
  drawSectionHeader('3. RIDER PAYOUT & DIRECT BANK DEPOSIT SETTINGS', curY);

  curY -= 20;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Settlement Bank:', data.bankName, 48, curY, 110, 140);
  doc.drawField('Account Number:', data.accountNumber, 300, curY, 110, 140);

  curY -= 18;
  doc.drawField('IFSC Code:', data.ifscCode, 48, curY, 110, 140);
  doc.drawField('Rider UPI ID:', data.upiId || 'Not provided', 300, curY, 110, 140);

  curY -= 18;
  doc.fillRect(36, curY - 3, 523, 16, 0.98, 0.98, 0.98);
  doc.drawField('Earning Structure:', 'Base Fee (Rs. 25) + Distance Bonus + Festival Incentives', 48, curY, 120, 350);

  // 6. Section 4: Operational Safety & Declaration
  curY -= 28;
  drawSectionHeader('4. RIDER PARTNER GUIDELINES & SAFETY COMMITMENT', curY);

  curY -= 18;
  doc.drawText('* Delivery Guidelines:', 48, curY, 8, 'F2', 0.2, 0.2, 0.2);
  doc.drawText('All orders must be delivered in clean thermal insulated bags with a valid helmet.', 150, curY, 8, 'F1', 0.3, 0.3, 0.3);

  curY -= 14;
  doc.drawText('* Live GPS Tracking:', 48, curY, 8, 'F2', 0.2, 0.2, 0.2);
  doc.drawText('Customer live location tracking activates only while order is out for delivery.', 150, curY, 8, 'F1', 0.3, 0.3, 0.3);

  // 7. Declaration Box
  curY -= 28;
  doc.fillRect(36, curY - 34, 523, 44, 0.96, 0.98, 0.96);
  doc.strokeRect(36, curY - 34, 523, 44, 0.85, 0.92, 0.85, 1);
  doc.drawText('RIDER DIGITAL DECLARATION & SAFETY PLEDGE', 48, curY + 2, 8, 'F2', 0.1, 0.45, 0.2);
  doc.drawText(
    'I agree to adhere to all traffic safety rules, maintain valid vehicle insurance, and provide respectful service to customers.',
    48,
    curY - 10,
    7.5,
    'F1',
    0.2,
    0.35,
    0.2
  );
  doc.drawText(
    'Generated automatically upon online registration submission on StreetBites Rider Portal.',
    48,
    curY - 22,
    7.5,
    'F3',
    0.4,
    0.4,
    0.4
  );

  // 8. Official Signatures & Dispatch Authority Stamp Block
  curY -= 65;

  // Rider Digital Signature (Left)
  doc.drawText(data.name, 52, curY + 8, 12, 'F3', 0.12, 0.22, 0.48);
  doc.drawText('[Digitally Authenticated Partner Copy]', 52, curY + 22, 6.5, 'F3', 0.45, 0.45, 0.45);
  doc.drawLine(48, curY, 220, curY, 0.7, 0.7, 0.7, 0.8);
  doc.drawText('Rider Partner Signature (Authenticated)', 48, curY - 12, 7.5, 'F2', 0.4, 0.4, 0.4);
  doc.drawText(data.name, 48, curY - 22, 8.5, 'F1', 0.1, 0.1, 0.1);

  // Authority Rubber Stamp & Signature (Right)
  doc.drawAuthorityStamp(435, curY + 28);
  doc.drawLine(350, curY, 520, curY, 0.7, 0.7, 0.7, 0.8);
  doc.drawText('StreetBites Dispatch Authority', 350, curY - 12, 7.5, 'F2', 0.4, 0.4, 0.4);
  doc.drawText('Fleet Management & Rider Support (Ahmedabad)', 350, curY - 22, 8, 'F1', 0.1, 0.1, 0.1);

  // 9. Footer
  doc.drawLine(36, 42, 559, 42, 0.85, 0.85, 0.85, 0.8);
  doc.drawText(
    'StreetBites Hyperlocal Network Pvt. Ltd. · rider-support@streetbites.com · Confidential Rider Copy · Page 1 of 1',
    50,
    30,
    7,
    'F1',
    0.5,
    0.5,
    0.5
  );

  const cleanName = data.name.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Rider';
  doc.download(`StreetBites_Rider_Application_${cleanName}.pdf`);
};
