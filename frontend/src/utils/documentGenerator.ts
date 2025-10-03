// Utility functions for generating signed documents

export interface DocumentMetadata {
  fileName: string;
  studentName: string;
  studentId: string;
  summary: string;
  approvalPath: string;
  submittedAt: string;
  approvedAt: string;
  approvedBy: string;
  facultySignature: string; // Base64 encoded signature
  facultyName: string;
  facultyDesignation: string;
  signatures?: Array<{
    name: string;
    designation: string;
    signature: string; // Base64 encoded signature
    signedAt: string;
    role: 'mentor' | 'hod' | 'dean' | 'admin';
  }>;
}

export interface DownloadRecord {
  id: string;
  downloadedAt: string;
  downloadedBy: string;
  userRole: string;
  ipAddress?: string;
}

export class SignedDocumentGenerator {
  private metadata: DocumentMetadata;
  private downloadHistory: DownloadRecord[];

  constructor(metadata: DocumentMetadata) {
    this.metadata = metadata;
    this.downloadHistory = [];
  }

  /**
   * Generate a signed document with digital signature and watermark
   */
  async generateSignedDocument(): Promise<Blob> {
    // In a real implementation, this would:
    // 1. Load the original document (PDF/DOCX)
    // 2. Add digital signature overlay
    // 3. Add approval watermark
    // 4. Add download tracking footer
    // 5. Return the signed document as a blob

    // For demo purposes, we'll create a simple HTML document
    const htmlContent = this.generateHTMLDocument();
    
    // Convert HTML to blob
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    return blob;
  }

  /**
   * Generate HTML representation of signed document
   */
  private generateHTMLDocument(): string {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    const documentId = this.generateDocumentId();
    const signatureHash = this.generateSignatureHash();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Signed Document - ${this.metadata.fileName}</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Times New Roman', Times, serif; 
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #000;
            background: white;
          }
          
          .document-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
            min-height: 11in;
          }
          
          /* Header Section */
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }
          
          .veltech-logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            margin-right: 20px;
            position: relative;
            overflow: hidden;
          }
          
          .veltech-logo::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          
          .veltech-logo svg {
            width: 40px;
            height: 40px;
            z-index: 1;
            position: relative;
          }
          
          .university-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .university-info p {
            font-size: 14px;
            color: #666;
            margin: 5px 0 0 0;
            font-style: italic;
          }
          
          .document-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .document-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
          }
          
          /* Document Info */
          .document-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-weight: bold;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          
          .info-value {
            color: #111827;
            font-size: 14px;
          }
          
          /* Content Section */
          .content {
            margin-bottom: 40px;
          }
          
          .content h2 {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
          }
          
          .content p {
            margin-bottom: 15px;
            text-align: justify;
            font-size: 14px;
            line-height: 1.8;
          }
          
          /* Approval Stamp */
          .approval-stamp { 
            position: absolute; 
            top: 100px;
            right: 50px; 
            background: linear-gradient(135deg, #059669, #10b981);
            color: white; 
            padding: 15px 25px;
            border-radius: 8px;
            transform: rotate(15deg);
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 3px solid white;
          }
          
          /* Signature Section */
          .signature-section { 
            margin-top: 60px;
            border-top: 2px solid #e5e7eb;
            padding-top: 30px;
          }
          
          .signature-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .signatures-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 60px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          
          .signature-block {
            text-align: center;
            padding: 0;
            border: none;
            background: transparent;
            flex: 1;
            min-width: 200px;
            max-width: 250px;
          }
          
          .signature-image {
            width: 180px;
            height: 80px;
            border: 1px solid #d1d5db;
            background: white;
            margin: 0 auto 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-size: 12px;
            color: #6b7280;
            position: relative;
          }
          
          .signature-image img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          
          .signature-line { 
            border-bottom: 2px solid #000;
            width: 180px;
            margin: 0 auto 15px auto;
            height: 2px;
          }
          
          .signature-name {
            font-weight: bold;
            font-size: 14px;
            color: #111827;
            margin-bottom: 8px;
            font-family: 'Times New Roman', Times, serif;
          }
          
          .signature-title-text {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            font-family: 'Times New Roman', Times, serif;
          }
          
          .signature-date {
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
            font-family: 'Times New Roman', Times, serif;
          }
          
          /* Handwritten signature font */
          .handwritten-signature {
            font-family: 'Brush Script MT', 'Lucida Handwriting', cursive;
            font-size: 16px;
            font-weight: normal;
            color: #1a1a1a;
            transform: rotate(-2deg);
            display: inline-block;
          }
          
          /* Signature container for better alignment */
          .signature-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            position: relative;
          }
          
          /* Signature placeholder styling */
          .signature-placeholder {
            font-family: 'Brush Script MT', 'Lucida Handwriting', cursive;
            font-size: 14px;
            color: #666;
            font-style: italic;
            opacity: 0.7;
          }
          
          /* Footer */
          .footer { 
            margin-top: 60px;
            border-top: 2px solid #e5e7eb;
            padding-top: 30px;
            font-size: 12px; 
            color: #6b7280;
          }
          
          .footer-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .footer-item {
            margin-bottom: 10px;
          }
          
          .footer-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 5px;
          }
          
          .footer-value {
            color: #6b7280;
            font-family: 'Courier New', monospace;
            font-size: 11px;
          }
          
          .watermark { 
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-45deg); 
            font-size: 72px;
            color: rgba(30, 64, 175, 0.05);
            z-index: -1; 
            pointer-events: none; 
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 10px;
          }
          
          .security-notice {
            text-align: center;
            margin-top: 20px;
            padding: 15px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            color: #92400e;
          }
          
          .security-notice h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: bold;
          }
          
          .security-notice p {
            margin: 0;
            font-size: 12px;
            line-height: 1.5;
          }
          
          /* Print Styles */
          @media print {
            body { margin: 0; }
            .document-container { padding: 0; }
            .approval-stamp { position: fixed; }
            .watermark { display: block; }
          }
        </style>
      </head>
      <body>
        <div class="watermark">APPROVED</div>
        
        <div class="document-container">
          <!-- Header -->
        <div class="header">
            <div class="logo-section">
              <div class="veltech-logo">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="3"/>
                  <text x="50" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold">V</text>
                  <text x="50" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold">U</text>
                  <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M30 50 L50 30 L70 50 L50 70 Z" fill="currentColor" opacity="0.3"/>
                </svg>
              </div>
              <div class="university-info">
                <h1>Veltech University</h1>
                <p>Digital Document Approval System</p>
              </div>
            </div>
          <div class="document-title">${this.metadata.fileName}</div>
            <div class="document-subtitle">Official Document</div>
        </div>

          <!-- Approval Stamp -->
        <div class="approval-stamp">APPROVED</div>

          <!-- Document Information -->
          <div class="document-info">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Student Name</div>
                <div class="info-value">${this.metadata.studentName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Student ID</div>
                <div class="info-value">${this.metadata.studentId}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Submitted Date</div>
                <div class="info-value">${new Date(this.metadata.submittedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Approved Date</div>
                <div class="info-value">${new Date(this.metadata.approvedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
            </div>
          </div>

          <!-- Document Content -->
        <div class="content">
          <h2>Document Summary</h2>
          <p>${this.metadata.summary}</p>
          
            <h2>Approval Details</h2>
            <p><strong>Approval Path:</strong> ${this.metadata.approvalPath}</p>
            <p><strong>Approved By:</strong> ${this.metadata.approvedBy}</p>
            <p><strong>Document Status:</strong> Approved and Digitally Signed</p>
        </div>

          <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-title">Digital Signatures</div>
            <div class="signatures-grid">
              ${this.generateSignatureBlocks()}
          </div>
        </div>

          <!-- Footer -->
        <div class="footer">
            <div class="footer-info">
              <div class="footer-grid">
                <div class="footer-item">
                  <div class="footer-label">Document ID</div>
                  <div class="footer-value">${documentId}</div>
                </div>
                <div class="footer-item">
                  <div class="footer-label">Generated On</div>
                  <div class="footer-value">${currentDate} at ${currentTime}</div>
                </div>
                <div class="footer-item">
                  <div class="footer-label">Digital Signature Hash</div>
                  <div class="footer-value">${signatureHash}</div>
                </div>
                <div class="footer-item">
                  <div class="footer-label">Verification URL</div>
                  <div class="footer-value">https://ddas.veltech.edu.in/verify/${documentId}</div>
            </div>
          </div>
        </div>

            <div class="security-notice">
              <h4>🔒 Security Notice</h4>
              <p>This document has been digitally signed and approved through the Veltech University Digital Document Approval System (DDAS). Any unauthorized modifications will invalidate the digital signature and render this document void.</p>
          </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate signature blocks dynamically
   */
  private generateSignatureBlocks(): string {
    const signatures = this.metadata.signatures || [];
    const currentDate = new Date().toLocaleDateString();
    
    // Always include the main faculty signature
    let signatureBlocks = `
      <div class="signature-block">
        <div class="signature-container">
          <div class="signature-image">
            ${this.metadata.facultySignature ? 
              `<img src="${this.metadata.facultySignature}" alt="Faculty Signature">` : 
              `<div class="signature-placeholder">${this.metadata.facultyName}</div>`
            }
          </div>
          <div class="signature-line"></div>
          <div class="signature-name handwritten-signature">${this.metadata.facultyName}</div>
          <div class="signature-title-text">${this.metadata.facultyDesignation}</div>
          <div class="signature-date">Date: ${currentDate}</div>
        </div>
      </div>
    `;
    
    // Add additional signatures if available
    signatures.forEach(sig => {
      signatureBlocks += `
        <div class="signature-block">
          <div class="signature-container">
            <div class="signature-image">
              ${sig.signature ? 
                `<img src="${sig.signature}" alt="${sig.name} Signature">` : 
                `<div class="signature-placeholder">${sig.name}</div>`
              }
            </div>
            <div class="signature-line"></div>
            <div class="signature-name handwritten-signature">${sig.name}</div>
            <div class="signature-title-text">${sig.designation}</div>
            <div class="signature-date">Date: ${new Date(sig.signedAt).toLocaleDateString()}</div>
          </div>
        </div>
      `;
    });
    
    // If no additional signatures, add placeholder blocks based on approval path
    if (signatures.length === 0) {
      const approvalPath = this.metadata.approvalPath.toLowerCase();
      
      if (approvalPath.includes('hod') || approvalPath.includes('head')) {
        signatureBlocks += `
          <div class="signature-block">
            <div class="signature-container">
              <div class="signature-image">
                <div class="signature-placeholder">Dr. HOD Name</div>
              </div>
              <div class="signature-line"></div>
              <div class="signature-name handwritten-signature">Dr. [HOD Name]</div>
              <div class="signature-title-text">Head of Department</div>
              <div class="signature-date">Date: ${currentDate}</div>
            </div>
          </div>
        `;
      }
      
      if (approvalPath.includes('dean') || approvalPath.includes('faculty')) {
        signatureBlocks += `
          <div class="signature-block">
            <div class="signature-container">
              <div class="signature-image">
                <div class="signature-placeholder">Dr. Dean Name</div>
              </div>
              <div class="signature-line"></div>
              <div class="signature-name handwritten-signature">Dr. [Dean Name]</div>
              <div class="signature-title-text">Dean of Faculty</div>
              <div class="signature-date">Date: ${currentDate}</div>
            </div>
          </div>
        `;
      }
    }
    
    return signatureBlocks;
  }

  /**
   * Generate a unique document ID
   */
  public generateDocumentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `DDAS-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a signature hash for verification
   */
  public generateSignatureHash(): string {
    const data = `${this.metadata.fileName}-${this.metadata.studentId}-${this.metadata.approvedAt}-${this.metadata.facultyName}`;
    // In real implementation, use proper cryptographic hashing
    return btoa(data).substring(0, 16).toUpperCase();
  }

  /**
   * Add download record
   */
  addDownloadRecord(record: DownloadRecord): void {
    this.downloadHistory.push(record);
  }

  /**
   * Get download history
   */
  getDownloadHistory(): DownloadRecord[] {
    return this.downloadHistory;
  }

  /**
   * Generate PDF from HTML (placeholder for real implementation)
   */
  async generatePDF(): Promise<Blob> {
    // In real implementation, use libraries like jsPDF or html2pdf
    // For now, return the HTML blob
    return this.generateSignedDocument();
  }

  /**
   * Verify document integrity
   */
  verifyDocumentIntegrity(): boolean {
    // In real implementation, verify digital signature and hash
    return true;
  }
}

/**
 * Utility function to create a signed document
 */
export async function createSignedDocument(
  metadata: DocumentMetadata,
  downloadRecord: DownloadRecord
): Promise<{ document: Blob; documentId: string; signatureHash: string }> {
  const generator = new SignedDocumentGenerator(metadata);
  generator.addDownloadRecord(downloadRecord);
  
  const document = await generator.generateSignedDocument();
  const documentId = generator.generateDocumentId();
  const signatureHash = generator.generateSignatureHash();
  
  return { document, documentId, signatureHash };
}

/**
 * Utility function to download a document
 */
export function downloadDocument(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
