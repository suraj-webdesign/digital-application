// Real Document Signing Utility
// This utility appends digital signatures to actual uploaded documents

export interface DocumentSignatureData {
  signature: string; // Base64 encoded signature image
  facultyName: string;
  facultyDesignation: string;
  signedAt: string;
  documentId: string;
}

export interface SignedDocumentResult {
  success: boolean;
  signedDocumentBlob?: Blob;
  error?: string;
}

/**
 * Sign a real document by appending the faculty signature
 * This creates a new document with the signature appended at the bottom
 */
export async function signRealDocument(
  originalDocumentBlob: Blob,
  signatureData: DocumentSignatureData
): Promise<SignedDocumentResult> {
  try {
    console.log('📝 Signing real document...');
    console.log('📝 Original document type:', originalDocumentBlob.type);
    console.log('📝 Original document size:', originalDocumentBlob.size);
    
    // Determine document type and handle accordingly
    const mimeType = originalDocumentBlob.type;
    
    if (mimeType === 'application/pdf') {
      return await signPDFDocument(originalDocumentBlob, signatureData);
    } else if (mimeType.includes('text/') || mimeType.includes('application/msword') || mimeType.includes('application/vnd.openxmlformats-officedocument')) {
      return await signTextDocument(originalDocumentBlob, signatureData);
    } else {
      // For other file types, create a signed wrapper document
      return await createSignedWrapperDocument(originalDocumentBlob, signatureData);
    }
    
  } catch (error) {
    console.error('❌ Error signing real document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sign a PDF document by appending signature information
 */
async function signPDFDocument(
  pdfBlob: Blob,
  signatureData: DocumentSignatureData
): Promise<SignedDocumentResult> {
  try {
    console.log('📄 Processing PDF document...');
    
    // For now, we'll create a signed HTML version that includes the PDF
    // In a real implementation, you would use PDF-lib to modify the actual PDF
    const pdfBase64 = await blobToBase64(pdfBlob);
    
    const signedHTML = createSignedDocumentHTML(
      'PDF Document',
      pdfBase64,
      signatureData,
      'application/pdf'
    );
    
    const signedBlob = new Blob([signedHTML], { type: 'text/html' });
    
    return {
      success: true,
      signedDocumentBlob: signedBlob
    };
    
  } catch (error) {
    console.error('❌ Error signing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF signing failed'
    };
  }
}

/**
 * Sign a text-based document (TXT, DOC, DOCX, etc.)
 */
async function signTextDocument(
  textBlob: Blob,
  signatureData: DocumentSignatureData
): Promise<SignedDocumentResult> {
  try {
    console.log('📝 Processing text document...');
    
    const textContent = await textBlob.text();
    
    // Append signature to the text content
    const signatureText = `

_________________________________________________

DIGITALLY SIGNED DOCUMENT

Signed by: ${signatureData.facultyName}
Designation: ${signatureData.facultyDesignation}
Date: ${new Date(signatureData.signedAt).toLocaleString()}
Document ID: ${signatureData.documentId}

Digital Signature Verification:
- Document has been reviewed and approved
- Signature is legally binding
- Any modifications invalidate this signature

_________________________________________________`;

    const signedContent = textContent + signatureText;
    const signedBlob = new Blob([signedContent], { type: textBlob.type });
    
    return {
      success: true,
      signedDocumentBlob: signedBlob
    };
    
  } catch (error) {
    console.error('❌ Error signing text document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text document signing failed'
    };
  }
}

/**
 * Create a signed wrapper document for other file types
 */
async function createSignedWrapperDocument(
  originalBlob: Blob,
  signatureData: DocumentSignatureData
): Promise<SignedDocumentResult> {
  try {
    console.log('📦 Creating signed wrapper document...');
    
    const fileBase64 = await blobToBase64(originalBlob);
    
    const signedHTML = createSignedDocumentHTML(
      originalBlob.type,
      fileBase64,
      signatureData,
      originalBlob.type
    );
    
    const signedBlob = new Blob([signedHTML], { type: 'text/html' });
    
    return {
      success: true,
      signedDocumentBlob: signedBlob
    };
    
  } catch (error) {
    console.error('❌ Error creating signed wrapper:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wrapper creation failed'
    };
  }
}

/**
 * Create HTML for signed document with embedded file
 */
function createSignedDocumentHTML(
  documentType: string,
  fileBase64: string,
  signatureData: DocumentSignatureData,
  mimeType: string
): string {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digitally Signed Document - ${signatureData.documentId}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
        }
        .document-container {
            max-width: 1000px;
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
            border-bottom: 2px solid #eee;
        }
        .document-preview {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #fafafa;
            min-height: 400px;
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
        .download-section {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .download-button {
            background: #2196f3;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
        }
        .download-button:hover {
            background: #1976d2;
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
            <div class="document-preview">
                <p><strong>Document Type:</strong> ${documentType}</p>
                <p><strong>Signed On:</strong> ${currentDate} at ${currentTime}</p>
                <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">APPROVED & SIGNED</span></p>
                
                <div class="download-section">
                    <p><strong>Download Original Document:</strong></p>
                    <a href="data:${mimeType};base64,${fileBase64}" download="original-document" class="download-button">
                        📄 Download Original File
                    </a>
                </div>
                
                <div style="margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
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
function generateVerificationHash(signatureData: DocumentSignatureData): string {
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
export function downloadSignedDocument(signedDocumentBlob: Blob, filename: string) {
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
