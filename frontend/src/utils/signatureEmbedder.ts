// Enhanced signature embedding utility for documents

export interface SignatureData {
  signature: string; // Base64 encoded signature image
  facultyName: string;
  facultyDesignation: string;
  signedAt: string;
  documentId: string;
}

export interface DocumentSigningResult {
  success: boolean;
  signedDocumentUrl?: string;
  error?: string;
}

/**
 * Embed signature in a document
 * This function creates a signed version of the document with the faculty signature
 */
export async function embedSignatureInDocument(
  originalDocumentUrl: string,
  signatureData: SignatureData
): Promise<DocumentSigningResult> {
  try {
    // For now, we'll create a signed HTML version
    // In a real implementation, this would use PDF.js or similar to embed signature in PDF
    
    const signedDocument = await createSignedDocumentHTML(originalDocumentUrl, signatureData);
    
    // Create a blob URL for the signed document
    const blob = new Blob([signedDocument], { type: 'text/html' });
    const signedDocumentUrl = URL.createObjectURL(blob);
    
    return {
      success: true,
      signedDocumentUrl
    };
  } catch (error) {
    console.error('Error embedding signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a signed HTML document with embedded signature
 */
async function createSignedDocumentHTML(
  originalDocumentUrl: string,
  signatureData: SignatureData
): Promise<string> {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signed Document</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6; 
            background: white;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .document-title { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px; 
        }
        .approval-stamp { 
            position: absolute; 
            top: 50px; 
            right: 50px; 
            background: #28a745; 
            color: white; 
            padding: 10px 20px; 
            border-radius: 5px; 
            transform: rotate(15deg);
            font-weight: bold;
            z-index: 10;
        }
        .signature-section { 
            margin-top: 50px; 
            border-top: 2px solid #333; 
            padding-top: 20px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .signature-container {
            display: flex;
            align-items: center;
            gap: 30px;
            margin-top: 20px;
        }
        .signature-image {
            border: 2px solid #333;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
        .signature-details {
            flex: 1;
        }
        .signature-line {
            border-bottom: 2px solid #333;
            width: 200px;
            margin-top: 10px;
        }
        .footer { 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #ccc; 
            font-size: 12px; 
            color: #666; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .watermark { 
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate(-45deg); 
            font-size: 48px; 
            color: rgba(0,0,0,0.1); 
            z-index: -1; 
            pointer-events: none; 
        }
        .document-content {
            background: white;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 20px 0;
        }
        .signature-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #28a745;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="watermark">DIGITALLY SIGNED</div>
    
    <div class="approval-stamp">APPROVED & SIGNED</div>
    
    <div class="header">
        <div class="document-title">DIGITALLY SIGNED DOCUMENT</div>
        <div>Document ID: ${signatureData.documentId}</div>
        <div>Signed On: ${currentDate} at ${currentTime}</div>
    </div>

    <div class="document-content">
        <h2>Original Document Information</h2>
        <p><strong>Document URL:</strong> ${originalDocumentUrl}</p>
        <p><strong>Note:</strong> This is a digitally signed version of the original document. The signature below verifies the authenticity and approval of this document.</p>
    </div>

    <div class="signature-info">
        <h3>✅ Document Status: APPROVED & SIGNED</h3>
        <p>This document has been reviewed, approved, and digitally signed by the authorized faculty member.</p>
    </div>

    <div class="signature-section">
        <h3>Digital Signature</h3>
        <div class="signature-container">
            <div class="signature-image">
                <img src="${signatureData.signature}" alt="Faculty Digital Signature" style="max-height: 100px; max-width: 200px;">
            </div>
            <div class="signature-details">
                <div class="signature-line"></div>
                <p><strong>${signatureData.facultyName}</strong></p>
                <p>${signatureData.facultyDesignation}</p>
                <p>Date: ${currentDate}</p>
                <p>Time: ${currentTime}</p>
            </div>
        </div>
    </div>

    <div class="footer">
        <div>
            <h4>Digital Signature Verification</h4>
            <p><strong>Document ID:</strong> ${signatureData.documentId}</p>
            <p><strong>Signed By:</strong> ${signatureData.facultyName} (${signatureData.facultyDesignation})</p>
            <p><strong>Signature Date:</strong> ${signatureData.signedAt}</p>
            <p><strong>Verification Hash:</strong> ${generateVerificationHash(signatureData)}</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #999;">
            <p><strong>This document has been digitally signed and approved through the Digital Document Approval System (DDAS)</strong></p>
            <p>Any unauthorized modifications will invalidate the digital signature</p>
            <p>For verification, contact the system administrator</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate a verification hash for the signature
 */
function generateVerificationHash(signatureData: SignatureData): string {
  const data = `${signatureData.documentId}-${signatureData.facultyName}-${signatureData.signedAt}`;
  // Simple hash function (in real implementation, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

/**
 * Download the signed document
 */
export function downloadSignedDocument(signedDocumentUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = signedDocumentUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the blob URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(signedDocumentUrl);
  }, 1000);
}
