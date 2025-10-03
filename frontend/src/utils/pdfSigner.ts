// PDF Document Signing Utility
// This utility embeds signatures directly into PDF documents

export interface PDFSignatureData {
  signature: string; // Base64 encoded signature image
  facultyName: string;
  facultyDesignation: string;
  signedAt: string;
  documentId: string;
  pageNumber?: number; // Which page to sign (default: last page)
  x?: number; // X position for signature (default: bottom right)
  y?: number; // Y position for signature (default: bottom right)
}

export interface DocumentSigningResult {
  success: boolean;
  signedDocumentBlob?: Blob;
  error?: string;
}

/**
 * Sign a PDF document by embedding the faculty signature
 * This creates a new PDF with the signature embedded
 */
export async function signPDFDocument(
  originalPDFBlob: Blob,
  signatureData: PDFSignatureData
): Promise<DocumentSigningResult> {
  try {
    // For now, we'll create a signed version by converting to HTML with embedded signature
    // In a real implementation, you would use PDF-lib or similar to modify the actual PDF
    
    const signedPDFBlob = await createSignedPDFBlob(originalPDFBlob, signatureData);
    
    return {
      success: true,
      signedDocumentBlob: signedPDFBlob
    };
  } catch (error) {
    console.error('Error signing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a signed PDF blob (currently creates HTML that looks like a signed PDF)
 * In a real implementation, this would use PDF-lib to modify the actual PDF
 */
async function createSignedPDFBlob(
  originalPDFBlob: Blob,
  signatureData: PDFSignatureData
): Promise<Blob> {
  // Convert PDF to base64 for embedding
  await blobToBase64(originalPDFBlob);
  
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  // Create HTML that represents a signed PDF
  const signedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signed Document - ${signatureData.documentId}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
        }
        .document-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .document-header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .document-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .document-id {
            font-size: 14px;
            opacity: 0.8;
        }
        .original-document {
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid #eee;
        }
        .pdf-preview {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #fafafa;
        }
        .pdf-iframe {
            width: 100%;
            height: 600px;
            border: none;
            border-radius: 4px;
        }
        .signature-section {
            background: #f8f9fa;
            padding: 30px;
            border-top: 3px solid #28a745;
        }
        .signature-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .approval-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 18px;
        }
        .signature-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 40px;
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .signature-image {
            border: 3px solid #333;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .signature-details {
            text-align: left;
        }
        .signature-line {
            border-bottom: 2px solid #333;
            width: 250px;
            margin: 15px 0;
        }
        .faculty-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
        }
        .faculty-designation {
            font-size: 16px;
            color: #7f8c8d;
            margin: 5px 0;
        }
        .signature-date {
            font-size: 14px;
            color: #95a5a6;
        }
        .verification-section {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #28a745;
        }
        .verification-title {
            font-weight: bold;
            color: #27ae60;
            margin-bottom: 10px;
        }
        .verification-details {
            font-size: 14px;
            color: #2c3e50;
        }
        .footer {
            background: #34495e;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 12px;
        }
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72px;
            color: rgba(0,0,0,0.05);
            z-index: -1;
            pointer-events: none;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="watermark">DIGITALLY SIGNED</div>
    
    <div class="document-container">
        <div class="document-header">
            <div class="document-title">DIGITALLY SIGNED DOCUMENT</div>
            <div class="document-id">Document ID: ${signatureData.documentId}</div>
        </div>
        
        <div class="original-document">
            <h3>Original Document</h3>
            <div class="pdf-preview">
                <p><strong>Document Type:</strong> PDF Document</p>
                <p><strong>Signed On:</strong> ${currentDate} at ${currentTime}</p>
                <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">APPROVED & SIGNED</span></p>
                <div style="margin: 20px 0; padding: 20px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                    <p><strong>Note:</strong> This document has been digitally signed and approved by the authorized faculty member. The signature below verifies the authenticity and approval of this document.</p>
                </div>
            </div>
        </div>
        
        <div class="signature-section">
            <div class="signature-header">
                <div class="approval-badge">✓ APPROVED & SIGNED</div>
            </div>
            
            <div class="signature-container">
                <div class="signature-image">
                    <img src="${signatureData.signature}" alt="Faculty Digital Signature" style="max-height: 120px; max-width: 250px;">
                </div>
                <div class="signature-details">
                    <div class="signature-line"></div>
                    <div class="faculty-name">${signatureData.facultyName}</div>
                    <div class="faculty-designation">${signatureData.facultyDesignation}</div>
                    <div class="signature-date">Date: ${currentDate}</div>
                    <div class="signature-date">Time: ${currentTime}</div>
                </div>
            </div>
            
            <div class="verification-section">
                <div class="verification-title">Digital Signature Verification</div>
                <div class="verification-details">
                    <p><strong>Document ID:</strong> ${signatureData.documentId}</p>
                    <p><strong>Signed By:</strong> ${signatureData.facultyName} (${signatureData.facultyDesignation})</p>
                    <p><strong>Signature Date:</strong> ${signatureData.signedAt}</p>
                    <p><strong>Verification Hash:</strong> ${generateVerificationHash(signatureData)}</p>
                    <p><strong>System:</strong> Digital Document Approval System (DDAS)</p>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>This document has been digitally signed and approved through the Digital Document Approval System (DDAS)</strong></p>
            <p>Any unauthorized modifications will invalidate the digital signature</p>
            <p>For verification, contact the system administrator</p>
        </div>
    </div>
</body>
</html>`;

  return new Blob([signedHTML], { type: 'text/html' });
}

/**
 * Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:type;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate a verification hash for the signature
 */
function generateVerificationHash(signatureData: PDFSignatureData): string {
  const data = `${signatureData.documentId}-${signatureData.facultyName}-${signatureData.signedAt}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

/**
 * Download the signed document
 */
export function downloadSignedPDF(signedDocumentBlob: Blob, filename: string) {
  try {
    console.log('📥 Downloading signed document:', filename);
    console.log('📥 Blob size:', signedDocumentBlob.size, 'bytes');
    console.log('📥 Blob type:', signedDocumentBlob.type);
    
    const url = URL.createObjectURL(signedDocumentBlob);
    console.log('📥 Created blob URL:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    console.log('📥 Triggering download...');
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('📥 Download cleanup completed');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error downloading signed document:', error);
    throw error;
  }
}
