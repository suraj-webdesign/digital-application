import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class LetterPDFService {
  constructor() {
    // Use the robust letter generator instead of the complex one
    const scriptPath = path.join(process.cwd(), 'backend', 'utils', 'robust_letter_generator.py');
    const altScriptPath = path.join(process.cwd(), 'utils', 'robust_letter_generator.py');
    
    if (fs.existsSync(scriptPath)) {
      this.pythonScriptPath = scriptPath;
    } else if (fs.existsSync(altScriptPath)) {
      this.pythonScriptPath = altScriptPath;
    } else {
      this.pythonScriptPath = scriptPath; // Default fallback
    }
    
    console.log('🐍 Using ROBUST letter generator:', this.pythonScriptPath);
    console.log('🐍 Script exists:', fs.existsSync(this.pythonScriptPath));
  }

  /**
   * Generate a professional letter PDF with signatures
   * @param {Object} data - Letter data
   * @param {string} data.letterText - The letter content
   * @param {Array} data.signers - Array of signer objects
   * @param {string} data.outputPath - Path where PDF should be saved
   * @returns {Promise<Object>} Result object
   */
  async generateLetterPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🚀 Starting letter PDF generation...');
        console.log('📄 Letter text length:', data.letterText?.length || 0);
        console.log('👥 Number of signers:', data.signers?.length || 0);
        console.log('📁 Output path:', data.outputPath);

        // Prepare data for robust Python script
        const pythonData = {
          letter_text: data.letterText || '',
          signers: data.signers || [],
          output_path: data.outputPath
        };

        console.log('🐍 Spawning Python process...');
        console.log('🐍 Python script path:', this.pythonScriptPath);
        console.log('🐍 Current working directory:', process.cwd());

        // Determine correct working directory
        const workingDir = fs.existsSync(path.join(process.cwd(), 'backend')) 
          ? process.cwd() 
          : path.join(process.cwd(), '..');
        
        console.log('🐍 Working directory:', workingDir);
        
        const pythonProcess = spawn('python', [this.pythonScriptPath, JSON.stringify(pythonData)], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: workingDir
        });

        let stdout = '';
        let stderr = '';

        // Collect output
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          console.log(`🐍 Python process exited with code: ${code}`);
          
          if (code !== 0) {
            console.error('❌ Python script error:', stderr);
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout);
            console.log('✅ PDF generation result:', result);
            
            if (result.success) {
              // Verify file was created - use the path returned by Python script
              const actualFilePath = result.output_path;
              const fullPath = path.isAbsolute(actualFilePath) 
                ? actualFilePath 
                : path.join(workingDir, actualFilePath);
              
              console.log('🔍 Checking file at:', fullPath);
              
              if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                console.log('📄 Generated PDF file size:', stats.size, 'bytes');
                // Update result with the correct full path
                result.output_path = fullPath;
                resolve(result);
              } else {
                console.error('❌ PDF file was not created at:', fullPath);
                console.error('❌ Original path from Python:', actualFilePath);
                console.error('❌ Working directory:', workingDir);
                reject(new Error('PDF file was not created'));
              }
            } else {
              console.error('❌ PDF generation failed:', result.error);
              reject(new Error(result.error || 'PDF generation failed'));
            }
          } catch (parseError) {
            console.error('❌ Error parsing Python output:', parseError);
            console.error('Raw stdout:', stdout);
            reject(new Error('Failed to parse Python script output'));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('❌ Python process error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error in generateLetterPDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate clean PDF (without signatures)
   * @param {string} letterText - The letter content
   * @param {string} outputPath - Path where PDF should be saved
   * @param {Object} studentInfo - Student information (optional)
   * @returns {Promise<Object>} Result object
   */
  async generateCleanPDF(letterText, outputPath, studentInfo = {}) {
    return this.generateLetterPDF({
      letterText,
      signers: [],
      outputPath
    });
  }

  /**
   * Generate signed PDF (with signatures)
   * @param {string} letterText - The letter content
   * @param {Array} signers - Array of signer objects
   * @param {string} outputPath - Path where PDF should be saved
   * @param {Object} studentInfo - Student information (optional)
   * @returns {Promise<Object>} Result object
   */
  async generateSignedPDF(letterText, signers, outputPath, studentInfo = {}) {
    return this.generateLetterPDF({
      letterText,
      signers,
      outputPath
    });
  }
}

// Create singleton instance
const letterPDFService = new LetterPDFService();

export default letterPDFService;
