import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Python Signature Service
 * Handles communication with Python signature processing
 */
class PythonSignatureService {
  constructor() {
    this.pythonScriptPath = path.join(__dirname, '../../python_signature_service.py');
  }

  /**
   * Process signatures on a PDF file
   * @param {string} inputPdfPath - Path to input PDF
   * @param {string} outputPdfPath - Path for output PDF
   * @param {Array} signatures - Array of signature data
   * @returns {Promise<Object>} Result object
   */
  async processSignatures(inputPdfPath, outputPdfPath, signatures) {
    return new Promise((resolve, reject) => {
      try {
        const requestData = {
          input_pdf_path: inputPdfPath,
          output_pdf_path: outputPdfPath,
          signatures: signatures
        };

        console.log('🐍 Calling Python signature service...');
        console.log('📝 Input PDF:', inputPdfPath);
        console.log('📝 Output PDF:', outputPdfPath);
        console.log('📝 Signatures count:', signatures.length);

        const pythonProcess = spawn('python', [this.pythonScriptPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              console.log('✅ Python signature service completed:', result);
              resolve(result);
            } catch (parseError) {
              console.error('❌ Error parsing Python output:', parseError);
              reject(new Error(`Failed to parse Python output: ${parseError.message}`));
            }
          } else {
            console.error('❌ Python process failed with code:', code);
            console.error('❌ Python stderr:', stderr);
            reject(new Error(`Python process failed with code ${code}: ${stderr}`));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('❌ Python process error:', error);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Send request data to Python process
        pythonProcess.stdin.write(JSON.stringify(requestData));
        pythonProcess.stdin.end();

      } catch (error) {
        console.error('❌ Error in processSignatures:', error);
        reject(error);
      }
    });
  }

  /**
   * Process signatures on a base64 encoded PDF
   * @param {string} base64Pdf - Base64 encoded PDF content
   * @param {Array} signatures - Array of signature data
   * @returns {Promise<Object>} Result object with base64 signed PDF
   */
  async processBase64Pdf(base64Pdf, signatures) {
    return new Promise((resolve, reject) => {
      try {
        const requestData = {
          base64_pdf: base64Pdf,
          signatures: signatures
        };

        console.log('🐍 Calling Python signature service for base64 PDF...');
        console.log('📝 PDF size:', base64Pdf.length, 'characters');
        console.log('📝 Signatures count:', signatures.length);

        const pythonProcess = spawn('python', [this.pythonScriptPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              console.log('✅ Python signature service completed:', result);
              resolve(result);
            } catch (parseError) {
              console.error('❌ Error parsing Python output:', parseError);
              reject(new Error(`Failed to parse Python output: ${parseError.message}`));
            }
          } else {
            console.error('❌ Python process failed with code:', code);
            console.error('❌ Python stderr:', stderr);
            reject(new Error(`Python process failed with code ${code}: ${stderr}`));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('❌ Python process error:', error);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Send request data to Python process
        pythonProcess.stdin.write(JSON.stringify(requestData));
        pythonProcess.stdin.end();

      } catch (error) {
        console.error('❌ Error in processBase64Pdf:', error);
        reject(error);
      }
    });
  }

  /**
   * Check if Python and required packages are available
   * @returns {Promise<boolean>} True if Python service is available
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      try {
        const pythonProcess = spawn('python', ['-c', 'import PyPDF2, reportlab, PIL; print("OK")'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        pythonProcess.on('close', (code) => {
          resolve(code === 0);
        });

        pythonProcess.on('error', () => {
          resolve(false);
        });

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Create signature data from faculty information
   * @param {Object} faculty - Faculty object with signature data
   * @param {string} approvalDate - Date of approval
   * @returns {Object} Signature data object
   */
  createSignatureData(faculty, approvalDate) {
    return {
      type: faculty.signature ? 'image' : 'text',
      name: faculty.name || 'Unknown',
      role: faculty.designation || faculty.role || 'Faculty',
      approval_date: approvalDate,
      text: faculty.name || 'Signature',
      image_data: faculty.signature || null, // Use image_data for base64 data
      image_path: null // Keep for file path compatibility
    };
  }
}

export default PythonSignatureService;
