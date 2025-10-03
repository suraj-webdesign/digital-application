import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import PythonSignatureService from './pythonSignatureService.js';

/**
 * Generate final signed PDF with signatures overlaid at the bottom
 * @param {string} originalPdfPath - Path to the original clean PDF
 * @param {Array} signatures - Array of signature objects with metadata
 * @param {string} outputPath - Path where the signed PDF will be saved
 * @returns {Promise<Object>} - Result object with success status and file info
 */
export const generateSignedPDF = async (originalPdfPath, signatures, outputPath) => {
  try {
    console.log('📄 Starting signed PDF generation...');
    console.log('📄 Original PDF:', originalPdfPath);
    console.log('📄 Signatures count:', signatures.length);
    console.log('📄 Output path:', outputPath);

    // Check if original PDF exists
    if (!fs.existsSync(originalPdfPath)) {
      throw new Error(`Original PDF not found: ${originalPdfPath}`);
    }

    // Prepare signature data for Python processing
    const signatureData = signatures.map(sig => ({
      type: sig.signature ? 'image' : 'text',
      name: sig.name || 'Unknown',
      role: sig.role || 'Faculty',
      approval_date: sig.approvedAt || new Date().toISOString().split('T')[0],
      text: sig.name || 'Signature',
      image_data: sig.signature || null,
      image_path: null
    }));

    console.log('📄 Prepared signature data:', signatureData);

    // Use Python signature service to overlay signatures
    const pythonService = new PythonSignatureService();
    const isPythonAvailable = await pythonService.checkAvailability();

    if (isPythonAvailable) {
      console.log('🐍 Using Python signature service for PDF processing...');
      
      const result = await pythonService.processSignatures(
        originalPdfPath, 
        outputPath, 
        signatureData
      );

      if (result.success) {
        console.log('✅ Python signature processing successful');
        return {
          success: true,
          filePath: outputPath,
          fileSize: result.file_size,
          signaturesCount: result.signatures_count,
          method: 'python'
        };
      } else {
        throw new Error(`Python processing failed: ${result.error}`);
      }
    } else {
      console.log('⚠️ Python service not available, using fallback method...');
      
      // Fallback: Create a simple HTML version with signatures
      return await generateSignedHTML(originalPdfPath, signatures, outputPath);
    }

  } catch (error) {
    console.error('❌ Error generating signed PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fallback method: Generate signed HTML document
 * @param {string} originalPdfPath - Path to the original PDF
 * @param {Array} signatures - Array of signature objects
 * @param {string} outputPath - Path where the signed HTML will be saved
 * @returns {Promise<Object>} - Result object
 */
const generateSignedHTML = async (originalPdfPath, signatures, outputPath) => {
  try {
    // Read the original PDF content (this is a simplified approach)
    // In a real implementation, you would convert PDF to HTML or extract text
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Signed Document</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .signature-section {
            margin-top: 60px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
        }
        .signature-row {
            display: flex;
            justify-content: center;
            gap: 60px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        .signature-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 200px;
            max-width: 250px;
        }
        .signature-image {
            max-height: 60px;
            max-width: 200px;
            margin-bottom: 10px;
        }
        .signature-details {
            text-align: center;
            font-family: Arial, sans-serif;
        }
        .signature-name {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 3px;
            border-top: 1px solid #333;
            padding-top: 3px;
            color: #333;
        }
        .signature-role {
            font-style: italic;
            font-size: 12px;
            margin-bottom: 3px;
            color: #555;
        }
        .signature-date {
            font-size: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="document-content">
        <p><strong>Original Document:</strong> ${path.basename(originalPdfPath)}</p>
        <p><em>This document has been digitally signed by the following authorized personnel:</em></p>
    </div>
    
    <div class="signature-section">
        <div class="signature-row">
            ${signatures.map(sig => `
                <div class="signature-block">
                    <div class="signature-image-container">
                        ${sig.signature ? 
                            `<img src="${sig.signature}" alt="Digital Signature" class="signature-image" />` :
                            `<div class="signature-image" style="border: 1px solid #ccc; padding: 10px; text-align: center; font-style: italic;">${sig.name}</div>`
                        }
                    </div>
                    <div class="signature-details">
                        <div class="signature-name">${sig.name}</div>
                        <div class="signature-role">${sig.role}</div>
                        <div class="signature-date">${sig.approvedAt ? new Date(sig.approvedAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    // Write the HTML file
    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    
    const fileSize = fs.statSync(outputPath).size;
    
    console.log('✅ Signed HTML document generated successfully');
    return {
      success: true,
      filePath: outputPath,
      fileSize: fileSize,
      signaturesCount: signatures.length,
      method: 'html_fallback'
    };

  } catch (error) {
    console.error('❌ Error generating signed HTML:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Convert HTML letter to PDF (if needed)
 * @param {string} htmlPath - Path to HTML file
 * @param {string} pdfPath - Path where PDF will be saved
 * @returns {Promise<Object>} - Result object
 */
export const convertHTMLToPDF = async (htmlPath, pdfPath) => {
  try {
    // This would use a library like Puppeteer or wkhtmltopdf
    // For now, we'll return the HTML path as a placeholder
    console.log('📄 HTML to PDF conversion not implemented yet');
    return {
      success: true,
      filePath: htmlPath,
      method: 'html_only'
    };
  } catch (error) {
    console.error('❌ Error converting HTML to PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  generateSignedPDF,
  convertHTMLToPDF
};
