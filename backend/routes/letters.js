import express from 'express';
import { body, validationResult, query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Letter from '../models/Letter.js';
import LetterTemplate from '../models/LetterTemplate.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
// import { createSignatureHTML } from '../utils/signatureGenerator.js'; // Not used
// import { addWatermarkToLetter } from '../utils/watermarkGenerator.js'; // Removed during cleanup
import PythonSignatureService from '../utils/pythonSignatureService.js';
import FacultyProfile from '../models/FacultyProfile.js';
import webSocketService from '../services/websocketService.js';
import { generateSignedPDF } from '../utils/pdfSignatureGenerator.js';
import DocumentApproval from '../models/DocumentApproval.js';
// import pdfLetterService from '../utils/pdfLetterService.js'; // Removed during cleanup
import letterPDFService from '../utils/letterPDFService.js';

const router = express.Router();

// Function to clean letter content (remove HTML tags and signature placeholders)
const cleanLetterContent = (content) => {
  if (!content) return '';
  
  // Remove any existing signature placeholders
  content = content.replace(/\{\{facultySignature\}\}/g, '');
  content = content.replace(/\{\{mentorSignature\}\}/g, '');
  content = content.replace(/\{\{hodSignature\}\}/g, '');
  content = content.replace(/\{\{deanSignature\}\}/g, '');
  content = content.replace(/\{\{signaturePlaceholders\}\}/g, '');
  
  // Remove signature row containers and CSS
  content = content.replace(/<style>[\s\S]*?\.signature-row[\s\S]*?<\/style>/g, '');
  content = content.replace(/<div class="signature-row">[\s\S]*?<\/div>/g, '');
  
  // Remove all HTML tags
  content = content.replace(/<[^>]*>/g, '');
  
  // Replace common HTML entities
  content = content.replace(/&nbsp;/g, ' ');
  content = content.replace(/&lt;/g, '<');
  content = content.replace(/&gt;/g, '>');
  content = content.replace(/&amp;/g, '&');
  
  // Clean up extra whitespace but preserve line breaks
  content = content.replace(/\n\s*\n/g, '\n\n');
  content = content.trim();
  
  return content;
};

// ===== DOWNLOAD ROUTES (MOVED TO TOP FOR PRIORITY) =====

// @route   GET /api/letters/:id/download-clean
// @desc    Download clean letter content (original without signatures)
// @access  Private
router.get('/:id/download-clean', asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Clean download route hit for letter ID:', req.params.id);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request method:', req.method);
    
    const letterId = req.params.id;
    const letter = await Letter.findById(letterId);

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if user has permission to download this letter
    const submittedById = letter.submittedBy?._id?.toString() || letter.submittedBy?.toString();
    const canDownload = (
      submittedById === req.user._id ||
      letter.assignedMentor?.toString() === req.user._id ||
      letter.assignedHOD?.toString() === req.user._id ||
      letter.assignedDean?.toString() === req.user._id ||
      req.user.role === 'admin'
    );

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Clean the content (remove any signature placeholders)
    const cleanContent = cleanLetterContent(letter.content);

    // Set headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="CLEAN_${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`);

    res.send(cleanContent);

  } catch (error) {
    console.error('Error downloading clean letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download clean letter'
    });
  }
}));

// @route   GET /api/letters/:id/download-signed
// @desc    Download signed letter PDF
// @access  Private
router.get('/:id/download-signed', asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Signed download route hit for letter ID:', req.params.id);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request method:', req.method);
    
    const letterId = req.params.id;
    const userId = req.user._id;

    // Find the letter
    const letter = await Letter.findById(letterId);
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if user has permission to download this letter
    const canDownload = letter.submittedBy.toString() === userId || 
                       letter.assignedMentor?.toString() === userId ||
                       letter.assignedHOD?.toString() === userId ||
                       letter.assignedDean?.toString() === userId ||
                       req.user.role === 'admin';

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Check if letter is signed
    if (letter.status !== 'signed') {
      return res.status(400).json({
        success: false,
        message: 'Letter is not signed yet'
      });
    }

    // Check if signed document exists
    if (!letter.signedDocument || !letter.signedDocument.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Signed document not found'
      });
    }

    // Check if the signed file exists on disk
    const signedFilePath = letter.signedDocument.filePath;
    if (!fs.existsSync(signedFilePath)) {
      console.log('⚠️ Signed file not found on disk:', signedFilePath);
      
      // Try to find the file with .html extension (fallback)
      const htmlFilePath = signedFilePath.replace('.pdf', '.html');
      if (fs.existsSync(htmlFilePath)) {
        console.log('✅ Found HTML version, serving that instead');
        
        // Serve the HTML file
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${letter.signedDocument.originalName || 'signed_letter.html'}"`);
        
        const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        res.send(htmlContent);
        return;
      }
      
      return res.status(404).json({
        success: false,
        message: 'Signed document file not found on server'
      });
    }

    // Serve the signed PDF file
    res.setHeader('Content-Type', letter.signedDocument.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${letter.signedDocument.originalName || 'signed_letter.pdf'}"`);
    
    const fileStream = fs.createReadStream(signedFilePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading signed letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download signed letter'
    });
  }
}));

// @route   GET /api/letters/:id/download
// @desc    Download letter content
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;
    const userId = req.user._id;

    // Find the letter
    const letter = await Letter.findById(letterId);
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if user has permission to download this letter
    const canDownload = letter.submittedBy.toString() === userId || 
                       letter.assignedMentor?.toString() === userId ||
                       letter.assignedHOD?.toString() === userId ||
                       letter.assignedDean?.toString() === userId ||
                       req.user.role === 'admin';

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Create HTML content for the letter
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${letter.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .letter-container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .letter-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .letter-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .letter-meta {
            color: #666;
            font-size: 14px;
        }
        .letter-content {
            margin-bottom: 30px;
        }
        .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
        }
        .signature-label {
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="letter-container">
        <div class="letter-header">
            <div class="letter-title">${letter.title}</div>
            <div class="letter-meta">
                Submitted on: ${new Date(letter.submittedAt).toLocaleDateString()}<br>
                Status: ${letter.status.toUpperCase()}<br>
                ${letter.submittedBy ? `Submitted by: ${letter.submittedBy.name || 'Unknown'}` : ''}
            </div>
        </div>
        
        <div class="letter-content">${letter.content}</div>
        
        ${letter.status === 'signed' && letter.signedDocument ? `
        <div class="signature-section">
            <div class="signature-label">Signed on: ${new Date(letter.signedDocument.signedAt).toLocaleDateString()}</div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    // Set headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`);

    res.send(htmlContent);

  } catch (error) {
    console.error('Error downloading letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download letter'
    });
  }
}));

// ===== END DOWNLOAD ROUTES =====

// ===== PDF GENERATION ROUTES =====

// @route   POST /api/letters/:id/generate-pdf
// @desc    Generate formal A4 PDF letter
// @access  Private
router.post('/:id/generate-pdf', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;
    const { type = 'clean' } = req.body; // 'clean' or 'signed'
    
    console.log('📄 Generating PDF for letter:', letterId, 'Type:', type);
    
    // Find the letter
    const letter = await Letter.findById(letterId).populate('submittedBy');
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check permissions
    // Handle populated submittedBy object
    const submittedById = letter.submittedBy?._id?.toString() || letter.submittedBy?.toString();
    
    const canGenerate = (
      // Student can always generate PDF for their own letters
      (req.user.role === 'student' && submittedById === req.user._id) ||
      // Faculty/HOD/Principal can generate PDF for letters assigned to them
      (['faculty', 'hod', 'principal'].includes(req.user.role) && (
        letter.assignedMentor?.toString() === req.user._id ||
        letter.assignedHOD?.toString() === req.user._id ||
        letter.assignedDean?.toString() === req.user._id
      )) ||
      // Admin can generate PDF for any letter
      req.user.role === 'admin'
    );

    if (!canGenerate) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to generate PDF for this letter'
      });
    }

    // Generate output filename
    const timestamp = Date.now();
    const filename = `${type}_letter_${letterId}_${timestamp}.pdf`;
    const outputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    
    console.log('🔍 Generated file path:', outputPath);
    console.log('🔍 Upload path:', process.env.UPLOAD_PATH || './uploads');

    let result;

    // Prepare signers data for signed PDFs
    let signers = [];
    if (type === 'signed' && letter.signatures && letter.signatures.length > 0) {
      console.log('✍️ Preparing signers data for', letter.signatures.length, 'signatures');
      
      for (const sig of letter.signatures) {
        const approver = await User.findById(sig.approver);
        if (approver) {
          // Try to get faculty profile signature first
          const facultyProfile = await FacultyProfile.findOne({ facultyId: sig.approver });
          let signatureData = null;
          
          if (facultyProfile && facultyProfile.hasSignature) {
            signatureData = facultyProfile.signatureUrl;
            console.log(`📝 Found faculty profile signature for ${approver.name}:`, signatureData ? 'Yes' : 'No');
          } else if (approver.signature) {
            signatureData = approver.signature;
            console.log(`📝 Found user signature for ${approver.name}:`, signatureData ? 'Yes' : 'No');
          } else if (sig.signature) {
            // Use signature from the signature record (added during approval)
            signatureData = sig.signature;
            console.log(`📝 Using signature from approval record for ${approver.name}:`, signatureData ? 'Yes' : 'No');
          } else {
            console.log(`⚠️  No signature found for ${approver.name}, will use cursive text`);
          }
          
          signers.push({
            name: approver.name,
            role: approver.role || approver.designation || 'Faculty',
            date: sig.signedAt,
            signatureImagePath: signatureData // Use signatureImagePath for Python script
          });
        }
      }
    }

    // Clean letter content to remove HTML tags
    const cleanContent = cleanLetterContent(letter.content);
    console.log('📄 Original content length:', letter.content.length);
    console.log('📄 Cleaned content length:', cleanContent.length);
    console.log('📄 Content preview:', cleanContent.substring(0, 100) + '...');

    if (type === 'signed') {
      // Generate signed PDF with available signatures
      console.log('📄 Generating signed PDF with', signers.length, 'signatures');
      result = await letterPDFService.generateSignedPDF(cleanContent, signers, outputPath);
    } else {
      // Generate clean PDF with advanced generator
      console.log('📄 Generating clean PDF');
      result = await letterPDFService.generateCleanPDF(cleanContent, outputPath);
    }

    if (result.success) {
      // Update letter with PDF info
      if (type === 'signed') {
        letter.signedDocument = {
          fileName: filename,
          filePath: outputPath,
          originalName: `SIGNED_${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          fileSize: result.fileSize,
          mimeType: 'application/pdf',
          generatedAt: new Date(),
          generatedBy: req.user._id,
          method: 'formal_pdf_generator'
        };
      } else {
        letter.cleanDocument = {
          fileName: filename,
          filePath: outputPath,
          originalName: `CLEAN_${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          fileSize: result.fileSize,
          mimeType: 'application/pdf',
          generatedAt: new Date(),
          generatedBy: req.user._id,
          method: 'formal_pdf_generator'
        };
      }
      
      await letter.save();

      res.json({
        success: true,
        message: `${type} PDF generated successfully`,
        data: {
          fileName: filename,
          filePath: outputPath,
          fileSize: result.fileSize,
          downloadUrl: `/api/letters/${letterId}/download-${type}-pdf`
        }
      });
    } else {
      console.error('❌ PDF generation failed:', result.error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
}));

// @route   GET /api/letters/:id/download-clean-pdf
// @desc    Download clean PDF letter
// @access  Private
router.get('/:id/download-clean-pdf', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;
    const letter = await Letter.findById(letterId);

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check permissions
    const submittedById = letter.submittedBy?._id?.toString() || letter.submittedBy?.toString();
    const canDownload = (
      submittedById === req.user._id ||
      letter.assignedMentor?.toString() === req.user._id ||
      letter.assignedHOD?.toString() === req.user._id ||
      letter.assignedDean?.toString() === req.user._id ||
      req.user.role === 'admin'
    );

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Check if clean PDF exists or if we need to generate it from content
    let filePath = null;
    
    if (letter.cleanDocument && letter.cleanDocument.filePath) {
      // New letters with cleanDocument field
      filePath = letter.cleanDocument.filePath;
      console.log('🔍 Using existing clean PDF:', filePath);
    } else {
      // Old letters without cleanDocument field - generate PDF from content
      console.log('🔍 No clean PDF found, generating from content...');
      
      try {
        // Generate output path for clean PDF
        const timestamp = Date.now();
        const filename = `clean_letter_${letterId}_${timestamp}.pdf`;
        const outputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
        
        // Clean letter content and generate PDF
        const cleanContent = cleanLetterContent(letter.content);
        const pdfResult = await letterPDFService.generateCleanPDF(cleanContent, outputPath);
        
        if (pdfResult.success) {
          // Update the letter with the new cleanDocument info
          letter.cleanDocument = {
            fileName: path.basename(pdfResult.output_path),
            filePath: pdfResult.output_path,
            fileSize: pdfResult.file_size,
            generatedAt: new Date()
          };
          await letter.save();
          
          filePath = pdfResult.output_path;
          console.log('✅ Generated new clean PDF:', filePath);
        } else {
          console.log('❌ Failed to generate clean PDF:', pdfResult.error);
          return res.status(500).json({
            success: false,
            message: 'Failed to generate clean PDF'
          });
        }
      } catch (error) {
        console.log('❌ Error generating clean PDF:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate clean PDF: ' + error.message
        });
      }
    }
    
    console.log('🔍 Final file path:', filePath);
    
    // Handle relative paths - convert to absolute path
    if (!path.isAbsolute(filePath)) {
      // Check if we're in backend directory and adjust path accordingly
      const projectRoot = process.cwd().endsWith('backend') 
        ? path.join(process.cwd(), '..') 
        : process.cwd();
      filePath = path.join(projectRoot, filePath);
    }
    
    console.log('🔍 Resolved file path:', filePath);
    console.log('🔍 File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Clean PDF file not found on server at path:', filePath);
      return res.status(404).json({
        success: false,
        message: 'Clean PDF file not found on server'
      });
    }

    // Serve the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${letter.cleanDocument.originalName || 'clean_letter.pdf'}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error downloading clean PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download clean PDF'
    });
  }
}));

// @route   GET /api/letters/:id/download-signed-pdf
// @desc    Download signed PDF letter
// @access  Private
router.get('/:id/download-signed-pdf', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;
    const letter = await Letter.findById(letterId);

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check permissions
    const submittedById = letter.submittedBy?._id?.toString() || letter.submittedBy?.toString();
    const canDownload = (
      submittedById === req.user._id ||
      letter.assignedMentor?.toString() === req.user._id ||
      letter.assignedHOD?.toString() === req.user._id ||
      letter.assignedDean?.toString() === req.user._id ||
      req.user.role === 'admin'
    );

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Check if letter is approved or signed (both can have signatures)
    if (letter.status !== 'signed' && letter.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Letter is not approved or signed yet'
      });
    }

    // Check if signed PDF exists or if we need to generate it
    let filePath = null;
    
    if (letter.signedDocument && letter.signedDocument.filePath) {
      // New letters with signedDocument field
      filePath = letter.signedDocument.filePath;
      console.log('🔍 Using existing signed PDF:', filePath);
    } else {
      // Old letters without signedDocument field - generate signed PDF
      console.log('🔍 No signed PDF found, generating from content and signatures...');
      
      try {
        // Get signers from signatures array
        const signers = [];
        if (letter.signatures && letter.signatures.length > 0) {
          for (const sig of letter.signatures) {
            const approver = await User.findById(sig.approver);
            if (approver) {
              // Try to get faculty profile signature first
              const facultyProfile = await FacultyProfile.findOne({ facultyId: sig.approver });
              let signatureData = null;
              
              if (facultyProfile && facultyProfile.hasSignature) {
                signatureData = facultyProfile.signatureUrl;
                console.log(`📝 Found faculty profile signature for ${approver.name}:`, signatureData ? 'Yes' : 'No');
              } else if (approver.signature) {
                signatureData = approver.signature;
                console.log(`📝 Found user signature for ${approver.name}:`, signatureData ? 'Yes' : 'No');
              } else {
                console.log(`⚠️  No signature found for ${approver.name}`);
              }
              
              signers.push({
                name: approver.name,
                role: approver.role || approver.designation || 'Faculty',
                date: sig.signedAt,
                signatureImagePath: signatureData // Use signatureImagePath for Python script
              });
            }
          }
        }
        
        // Generate output path for signed PDF
        const timestamp = Date.now();
        const filename = `signed_letter_${letterId}_${timestamp}.pdf`;
        const outputPath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
        
        // Clean letter content and generate signed PDF
        const cleanContent = cleanLetterContent(letter.content);
        const pdfResult = await letterPDFService.generateSignedPDF(cleanContent, signers, outputPath);
        
        if (pdfResult.success) {
          // Update the letter with the new signedDocument info
          letter.signedDocument = {
            fileName: path.basename(pdfResult.output_path),
            filePath: pdfResult.output_path,
            fileSize: pdfResult.file_size,
            signedAt: new Date()
          };
          await letter.save();
          
          filePath = pdfResult.output_path;
          console.log('✅ Generated new signed PDF:', filePath);
        } else {
          console.log('❌ Failed to generate signed PDF:', pdfResult.error);
          return res.status(500).json({
            success: false,
            message: 'Failed to generate signed PDF'
          });
        }
      } catch (error) {
        console.log('❌ Error generating signed PDF:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate signed PDF: ' + error.message
        });
      }
    }
    
    // Handle relative paths - convert to absolute path
    if (!path.isAbsolute(filePath)) {
      // Check if we're in backend directory and adjust path accordingly
      const projectRoot = process.cwd().endsWith('backend') 
        ? path.join(process.cwd(), '..') 
        : process.cwd();
      filePath = path.join(projectRoot, filePath);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Signed PDF file not found on server'
      });
    }

    // Serve the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${letter.signedDocument.originalName || 'signed_letter.pdf'}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Error downloading signed PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download signed PDF'
    });
  }
}));

// ===== END PDF GENERATION ROUTES =====

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
    }
  }
});

// @route   GET /api/letters/templates
// @desc    Get all active letter templates
// @access  Private
router.get('/templates', asyncHandler(async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const templates = await LetterTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        templates,
        count: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch letter templates'
    });
  }
}));

// @route   GET /api/letters/templates/:id
// @desc    Get specific letter template
// @access  Private
router.get('/templates/:id', asyncHandler(async (req, res) => {
  try {
    const template = await LetterTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        template
      }
    });
  } catch (error) {
    console.error('Error fetching letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch letter template'
    });
  }
}));

// @route   POST /api/letters/templates
// @desc    Create new letter template (Admin only)
// @access  Private (Admin)
router.post('/templates', requireAdmin, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('category')
    .isIn(['application', 'request', 'complaint', 'recommendation', 'certificate', 'other'])
    .withMessage('Invalid category'),
  body('template')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Template content is required'),
  body('fields')
    .isArray()
    .withMessage('Fields must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { name, description, category, template, fields } = req.body;

  const letterTemplate = new LetterTemplate({
    name,
    description,
    category,
    template,
    fields,
    createdBy: req.user._id
  });

  await letterTemplate.save();

  res.status(201).json({
    success: true,
    message: 'Letter template created successfully',
    data: {
      template: letterTemplate
    }
  });
}));

// @route   POST /api/letters/generate
// @desc    Generate letter from template with optional proof file
// @access  Private
router.post('/generate', upload.single('proofFile'), asyncHandler(async (req, res) => {
  try {
    console.log('📥 Backend: Letter generation request received');
    console.log('📥 Backend: User:', req.user ? req.user.email : 'No user');
    console.log('📥 Backend: Body:', req.body);
    console.log('📥 Backend: File:', req.file ? req.file.originalname : 'No file');
    
    const { templateId, title, fields, assignedMentor, assignedHOD, assignedDean } = req.body;
    
    // Validate required fields
    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'Template ID is required'
      });
    }
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    if (!fields) {
      return res.status(400).json({
        success: false,
        message: 'Fields are required'
      });
    }
    
    // Parse fields if it's a string
    let parsedFields;
    try {
      parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields format'
      });
    }

  // Get template (either from database or hardcoded)
  let template;
  let content;
  
  if (templateId === 'custom') {
    // Handle hardcoded Custom Letter template
    template = {
      _id: 'custom',
      name: 'Custom Letter',
      description: 'Simple notepad to write any custom letter for submission or approval',
      category: 'custom',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
<div style="margin-bottom: 20px; text-align: justify;">
  {{customContent}}
</div>
</div>`,
      fields: [
        { name: 'customContent', label: 'Write Your Letter', type: 'textarea', required: true }
      ]
    };
    
    // For custom letter, use the content directly from the request
    content = req.body.content || parsedFields.customContent || '';
    
    // Clean the content (remove any signature placeholders)
    content = cleanLetterContent(content);
  } else if (templateId === 'application') {
    // Handle hardcoded Application Letter template
    template = {
      _id: 'application',
      name: 'Application Letter',
      description: 'Template for formal application letters',
      category: 'application',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
<div style="margin-bottom: 20px;">
  <strong>{{fromName}}</strong><br>
  {{fromAddress}}<br>
  Email: {{fromEmail}}<br>
  Phone: {{fromPhone}}
</div>

<div style="margin-bottom: 20px;">
  <strong>Date:</strong> {{date}}
</div>

<div style="margin-bottom: 20px;">
  <strong>To:</strong><br>
  {{toName}}<br>
  {{toDesignation}}<br>
  {{toDepartment}}<br>
{{institutionName}}
</div>

<div style="margin-bottom: 20px;">
  <strong>Subject:</strong> {{subject}}
</div>

<div style="margin-bottom: 20px;">
{{salutation}},
</div>

<div style="margin-bottom: 20px; text-align: justify;">
{{mainBody}}
</div>

<div style="margin-bottom: 20px;">
I hope you will consider my application favorably.
</div>

<div style="margin-bottom: 20px;">
Thank you for your time and consideration.
</div>

<div style="margin-bottom: 20px;">
  Yours sincerely,<br>
{{fromName}}
</div>
</div>`,
      fields: [
        { name: 'fromName', label: 'Your Name', type: 'text', required: true },
        { name: 'fromAddress', label: 'Your Address', type: 'textarea', required: true },
        { name: 'fromEmail', label: 'Your Email', type: 'text', required: true },
        { name: 'fromPhone', label: 'Your Phone', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'toName', label: 'Recipient Name', type: 'text', required: true },
        { name: 'toDesignation', label: 'Recipient Designation', type: 'text', required: true },
        { name: 'toDepartment', label: 'Department', type: 'text', required: true },
        { name: 'institutionName', label: 'Institution Name', type: 'text', required: true },
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'salutation', label: 'Salutation', type: 'text', required: true },
        { name: 'mainBody', label: 'Main Body', type: 'textarea', required: true }
      ]
    };
    
    // Generate letter content by replacing placeholders
    content = template.template;
    Object.keys(parsedFields).forEach(key => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), parsedFields[key] || '');
    });
    
    // Clean the content (remove any signature placeholders)
    content = cleanLetterContent(content);
  } else {
    // Handle database templates
    template = await LetterTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Generate letter content by replacing placeholders
    content = template.template;
    Object.keys(parsedFields).forEach(key => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), parsedFields[key] || '');
    });
    
    // Clean the content (remove any signature placeholders)
    content = cleanLetterContent(content);
  }

  // Verify assigned faculty members
  const assignedFaculty = [];
  if (assignedMentor) {
    const mentor = await User.findById(assignedMentor);
    if (!mentor || !['faculty', 'hod', 'principal'].includes(mentor.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mentor assigned'
      });
    }
    assignedFaculty.push(mentor);
  }

  if (assignedHOD) {
    const hod = await User.findById(assignedHOD);
    if (!hod || !['faculty', 'hod', 'principal'].includes(hod.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid HOD assigned'
      });
    }
    assignedFaculty.push(hod);
  }

  if (assignedDean) {
    const dean = await User.findById(assignedDean);
    if (!dean || !['faculty', 'hod', 'principal'].includes(dean.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Dean assigned'
      });
    }
    assignedFaculty.push(dean);
  }

  // Determine current approver
  let currentApprover = null;
  if (assignedMentor) {
    currentApprover = assignedMentor;
  } else if (assignedHOD) {
    currentApprover = assignedHOD;
  } else if (assignedDean) {
    currentApprover = assignedDean;
  }

  // Handle proof file if uploaded
  let proofFileInfo = null;
  if (req.file) {
    proofFileInfo = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    };
  }

  // Add watermark to the content
  // const contentWithWatermark = addWatermarkToLetter(content); // Removed during cleanup
  const contentWithWatermark = content; // Use original content without watermark

  // Create letter
  const letter = new Letter({
    title,
    templateId,
    content: contentWithWatermark,
    fields: parsedFields,
    submittedBy: req.user._id,
    studentId: req.user._id, // Add studentId field
    assignedMentor: assignedMentor || null,
    assignedHOD: assignedHOD || null,
    assignedDean: assignedDean || null,
    currentApprover,
    workflowStep: assignedMentor ? 'mentor' : (assignedHOD ? 'hod' : 'dean'),
    status: 'pending',
    proofFile: proofFileInfo
  });

  await letter.save();

  // Populate user details
  await letter.populate('submittedBy', 'name email role vtuId facultyId department');
  await letter.populate('assignedMentor', 'name email designation');
  await letter.populate('assignedHOD', 'name email designation');
  await letter.populate('assignedDean', 'name email designation');
  
  // Only populate templateId if it's an ObjectId (not a hardcoded string)
  if (typeof letter.templateId === 'string' && letter.templateId.match(/^[0-9a-fA-F]{24}$/)) {
    await letter.populate('templateId', 'name category');
  }

  res.status(201).json({
    success: true,
    message: 'Letter generated successfully',
    data: {
      letter
    }
  });
  
  } catch (error) {
    console.error('❌ Backend: Error generating letter:', error);
    console.error('❌ Backend: Error stack:', error.stack);
    
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 10MB allowed.'
      });
    }
    
    if (error.message.includes('Only PDF, DOC, DOCX, JPG, PNG files are allowed')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG files are allowed.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate letter',
      error: error.message
    });
  }
}));

// @route   GET /api/letters/my
// @desc    Get current user's letters
// @access  Private
router.get('/my', asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    const letters = await Letter.find({ submittedBy: userId })
      .populate('submittedBy', 'name email role vtuId facultyId')
      .populate('assignedMentor', 'name email designation')
      .populate('assignedHOD', 'name email designation')
      .populate('assignedDean', 'name email designation')
      .populate('currentApprover', 'name email designation')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        letters,
        count: letters.length
      }
    });
  } catch (error) {
    console.error('Error fetching user letters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user letters'
    });
  }
}));

// @route   GET /api/letters/assigned
// @desc    Get letters assigned to current faculty member
// @access  Private (Faculty only)
router.get('/assigned', asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('🔍 Dashboard Debug Info:');
    console.log('👤 Faculty ID:', userId);
    console.log('👤 Faculty Role:', req.user.role);
    
    // Find letters where the faculty can approve based on workflow step
    const letters = await Letter.find({
      status: 'pending',
      $or: [
        // Mentor can approve at mentor step
        { workflowStep: 'mentor', assignedMentor: userId },
        // HOD can approve at HOD step
        { workflowStep: 'hod', assignedHOD: userId },
        // Dean can approve at dean step
        { workflowStep: 'dean', assignedDean: userId },
        // Fallback: currentApprover field
        { currentApprover: userId }
      ]
    })
      .select('title content status submittedAt approvedAt approvedBy rejectionReason workflowStep assignedMentor assignedHOD assignedDean currentApprover submittedBy')
      .populate('submittedBy', 'name email role vtuId facultyId department')
      .populate('assignedMentor', 'name email designation')
      .populate('assignedHOD', 'name email designation')
      .populate('assignedDean', 'name email designation')
      .populate('currentApprover', 'name email designation')
      .sort({ submittedAt: -1 });

    console.log('📋 Found letters for faculty:', letters.length);
    letters.forEach((letter, index) => {
      console.log(`📝 Letter ${index + 1}:`, {
        id: letter._id,
        title: letter.title,
        workflowStep: letter.workflowStep,
        assignedMentor: letter.assignedMentor?.toString(),
        assignedHOD: letter.assignedHOD?.toString(),
        assignedDean: letter.assignedDean?.toString(),
        currentApprover: letter.currentApprover?.toString()
      });
    });

    res.json({
      success: true,
      data: {
        letters,
        count: letters.length
      }
    });
  } catch (error) {
    console.error('Error fetching assigned letters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned letters'
    });
  }
}));

// @route   POST /api/letters/:id/approve
// @desc    Approve letter
// @access  Private (Faculty only)
router.post('/:id/approve', [
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const letterId = req.params.id;
  const facultyId = req.user._id;
  const { comment } = req.body;

  const letter = await Letter.findById(letterId);
  if (!letter) {
    return res.status(404).json({
      success: false,
      message: 'Letter not found'
    });
  }

  // Debug information
  console.log('🔍 Approval Debug Info:');
  console.log('📝 Letter ID:', letterId);
  console.log('👤 Faculty ID:', facultyId);
  console.log('👤 Faculty Role:', req.user.role);
  console.log('👤 Faculty Name:', req.user.name);
  console.log('👤 Faculty Email:', req.user.email);
  console.log('📋 Letter Workflow Step:', letter.workflowStep);
  console.log('👨‍🏫 Assigned Mentor:', letter.assignedMentor?.toString());
  console.log('👨‍💼 Assigned HOD:', letter.assignedHOD?.toString());
  console.log('👨‍🎓 Assigned Dean:', letter.assignedDean?.toString());
  console.log('⏭️ Current Approver:', letter.currentApprover?.toString());
  console.log('📋 Letter Status:', letter.status);
  console.log('📋 Letter Title:', letter.title);
  console.log('👤 Submitted By:', letter.submittedBy?.toString());

  // Check if faculty has permission to approve this letter at current step
  let canApprove = false;
  
  // Admin can always approve
  if (req.user.role === 'admin') {
    canApprove = true;
  }
  // Check workflow step and faculty assignment
  else if (letter.workflowStep === 'mentor' && letter.assignedMentor?.toString() === facultyId.toString()) {
    canApprove = true;
  }
  else if (letter.workflowStep === 'hod' && letter.assignedHOD?.toString() === facultyId.toString()) {
    canApprove = true;
  }
  else if (letter.workflowStep === 'dean' && letter.assignedDean?.toString() === facultyId.toString()) {
    canApprove = true;
  }
  // Check if faculty is the current approver (fallback)
  else if (letter.currentApprover?.toString() === facultyId.toString()) {
    canApprove = true;
  }

  console.log('✅ Can Approve:', canApprove);
  console.log('🔍 Authorization Check Details:');
  console.log('  - Is Admin:', req.user.role === 'admin');
  console.log('  - Workflow Step:', letter.workflowStep);
  console.log('  - Faculty is Mentor:', letter.workflowStep === 'mentor' && letter.assignedMentor?.toString() === facultyId.toString());
  console.log('  - Faculty is HOD:', letter.workflowStep === 'hod' && letter.assignedHOD?.toString() === facultyId.toString());
  console.log('  - Faculty is Dean:', letter.workflowStep === 'dean' && letter.assignedDean?.toString() === facultyId.toString());
  console.log('  - Faculty is Current Approver:', letter.currentApprover?.toString() === facultyId.toString());

  if (!canApprove) {
    console.log('❌ Authorization failed for faculty approval');
    console.log('❌ Faculty ID:', facultyId);
    console.log('❌ Letter Assigned Mentor:', letter.assignedMentor?.toString());
    console.log('❌ Letter Assigned HOD:', letter.assignedHOD?.toString());
    console.log('❌ Letter Assigned Dean:', letter.assignedDean?.toString());
    console.log('❌ Letter Current Approver:', letter.currentApprover?.toString());
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to approve this letter at this stage'
    });
  }

  // Determine next workflow step
  let nextApprover = null;
  let nextWorkflowStep = 'completed';
  let newStatus = 'approved';

  if (letter.workflowStep === 'mentor' && letter.assignedHOD) {
    // Move from mentor to HOD
    nextApprover = letter.assignedHOD;
    nextWorkflowStep = 'hod';
    newStatus = 'pending';
  } else if (letter.workflowStep === 'hod' && letter.assignedDean) {
    // Move from HOD to Dean
    nextApprover = letter.assignedDean;
    nextWorkflowStep = 'dean';
    newStatus = 'pending';
  } else if (letter.workflowStep === 'dean') {
    // Final approval - letter is fully approved
    nextWorkflowStep = 'completed';
    newStatus = 'approved';
  } else {
    // No next step - letter is approved
    nextWorkflowStep = 'completed';
    newStatus = 'approved';
  }

  // Update letter
  letter.workflowStep = nextWorkflowStep;
  letter.status = newStatus;
  letter.currentApprover = nextApprover;

  // Only set final approval details if this is the final step
  if (nextWorkflowStep === 'completed') {
    letter.approvedBy = facultyId;
    letter.approvedAt = new Date();
  }

  // Add faculty signature to the letter when they approve
  // Check if faculty has already signed this letter
  const hasAlreadySigned = letter.signatures.some(sig => sig.approver.toString() === facultyId);
  
  if (!hasAlreadySigned) {
    // Get faculty information for signature
    const faculty = await User.findById(facultyId).select('name signature designation role');
    const facultyProfile = await FacultyProfile.findOne({ facultyId: facultyId });
    
    let signatureData = null;
    
    // Try to get faculty profile signature first
    if (facultyProfile && facultyProfile.hasSignature) {
      signatureData = facultyProfile.signatureUrl;
      console.log(`📝 Found faculty profile signature for ${faculty.name}:`, signatureData ? 'Yes' : 'No');
    } else if (faculty.signature) {
      signatureData = faculty.signature;
      console.log(`📝 Found user signature for ${faculty.name}:`, signatureData ? 'Yes' : 'No');
    } else {
      console.log(`⚠️  No signature found for ${faculty.name}, will use cursive text`);
    }
    
    // Add signature record to the letter
    const signatureRecord = {
      approver: facultyId,
      approverName: faculty.name,
      approverRole: faculty.designation || faculty.role || 'Faculty',
      signature: signatureData || null, // Use null if no signature image, will use cursive text in PDF
      signedAt: new Date()
    };
    
    letter.signatures.push(signatureRecord);
    console.log(`✅ Added faculty signature for ${faculty.name} during approval`);
  }

  await letter.save();

  // Create approval record in document_approvals table
  try {
    const faculty = await User.findById(facultyId).select('name designation role');
    const student = await User.findById(letter.submittedBy).select('name');
    
    await DocumentApproval.createApprovalRecord({
      document_id: letter._id,
      approver_id: facultyId,
      status: 'approved',
      comment: comment || null,
      approver_name: faculty.name,
      approver_role: faculty.role,
      approver_designation: faculty.designation || 'Faculty',
      document_title: letter.title,
      student_name: student.name,
      student_id: letter.submittedBy,
      file_name: letter.fileName || null,
      file_size: letter.fileSize || 0,
      mime_type: letter.mimeType || 'text/html',
      workflow_step: nextWorkflowStep,
      is_final_approval: nextWorkflowStep === 'completed',
      approved_at: new Date()
    });
    
    console.log('✅ Approval record created in document_approvals table');
  } catch (error) {
    console.error('❌ Error creating approval record:', error);
    // Don't fail the approval if record creation fails
  }

  // Broadcast approval update via WebSocket
  const faculty = await User.findById(facultyId).select('name designation');
  webSocketService.broadcastApprovalUpdate({
    letterId: letter._id,
    studentId: letter.submittedBy,
    facultyId: facultyId,
    status: newStatus,
    approverName: faculty.name,
    approverRole: faculty.designation || 'Faculty',
    workflowStep: nextWorkflowStep,
    nextApprover: nextApprover
  });

  res.json({
    success: true,
    message: nextWorkflowStep === 'completed' 
      ? 'Letter fully approved' 
      : `Letter approved, moved to ${nextWorkflowStep} stage`,
    data: {
      letter: letter,
      nextStep: nextWorkflowStep,
      nextApprover: nextApprover
    }
  });
}));

// @route   POST /api/letters/:id/reject
// @desc    Reject letter
// @access  Private (Faculty only)
router.post('/:id/reject', [
  body('reason')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason is required and must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const letterId = req.params.id;
  const userId = req.user._id;

  const letter = await Letter.findById(letterId);
  if (!letter) {
    return res.status(404).json({
      success: false,
      message: 'Letter not found'
    });
  }

  // Check if current user has permission to reject this letter at current step
  let canReject = false;
  
  // Admin can always reject
  if (req.user.role === 'admin') {
    canReject = true;
  }
  // Check workflow step and faculty assignment
  else if (letter.workflowStep === 'mentor' && letter.assignedMentor?.toString() === userId) {
    canReject = true;
  }
  else if (letter.workflowStep === 'hod' && letter.assignedHOD?.toString() === userId) {
    canReject = true;
  }
  else if (letter.workflowStep === 'dean' && letter.assignedDean?.toString() === userId) {
    canReject = true;
  }
  // Check if faculty is the current approver (fallback)
  else if (letter.currentApprover?.toString() === userId) {
    canReject = true;
  }

  if (!canReject) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to reject this letter at this stage'
    });
  }

  if (letter.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Letter is not pending approval'
    });
  }

  // Reject letter
  await letter.reject(reason);

  // Create rejection record in document_approvals table
  try {
    const faculty = await User.findById(userId).select('name designation role');
    const student = await User.findById(letter.submittedBy).select('name');
    
    await DocumentApproval.createApprovalRecord({
      document_id: letter._id,
      approver_id: userId,
      status: 'rejected',
      rejection_reason: reason,
      approver_name: faculty.name,
      approver_role: faculty.role,
      approver_designation: faculty.designation || 'Faculty',
      document_title: letter.title,
      student_name: student.name,
      student_id: letter.submittedBy,
      file_name: letter.fileName || null,
      file_size: letter.fileSize || 0,
      mime_type: letter.mimeType || 'text/html',
      workflow_step: 'rejected',
      is_final_approval: false,
      approved_at: new Date()
    });
    
    console.log('✅ Rejection record created in document_approvals table');
  } catch (error) {
    console.error('❌ Error creating rejection record:', error);
    // Don't fail the rejection if record creation fails
  }

  // Broadcast rejection update via WebSocket
  const faculty = await User.findById(userId).select('name designation');
  webSocketService.broadcastApprovalUpdate({
    letterId: letter._id,
    studentId: letter.submittedBy,
    facultyId: userId,
    status: 'rejected',
    approverName: faculty.name,
    approverRole: faculty.designation || 'Faculty',
    workflowStep: 'rejected',
    rejectionReason: reason
  });

  res.json({
    success: true,
    message: 'Letter rejected successfully',
    data: {
      letter
    }
  });
}));

// @route   POST /api/letters/:id/sign
// @desc    Sign letter and proof file (only final approver can sign)
// @access  Private (Faculty/Admin)
router.post('/:id/sign', [
  body('signatureData')
    .isObject()
    .withMessage('Signature data is required'),
  body('signatureData.facultyName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Faculty name is required'),
  body('signatureData.facultyDesignation')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Faculty designation is required'),
  body('signatureData.signature')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Signature is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const letterId = req.params.id;
    const { signatureData } = req.body;
    const facultyId = req.user._id;

    // Find the letter
    const letter = await Letter.findById(letterId);
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if letter is approved (can be signed by any faculty in workflow)
    if (letter.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Letter must be approved before signing'
      });
    }

    // Check if faculty is in the workflow and hasn't already signed
    const isInWorkflow = (
      letter.assignedMentor?.toString() === facultyId ||
      letter.assignedHOD?.toString() === facultyId ||
      letter.assignedDean?.toString() === facultyId
    );

    const hasAlreadySigned = letter.signatures.some(sig => sig.approver.toString() === facultyId);

    if (!isInWorkflow && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to sign this letter'
      });
    }

    if (hasAlreadySigned) {
      return res.status(400).json({
        success: false,
        message: 'You have already signed this letter'
      });
    }

    // Add signature to the letter's signature collection
    const signatureRecord = {
      approver: facultyId,
      approverName: signatureData.facultyName,
      approverRole: signatureData.facultyDesignation,
      signature: signatureData.signature,
      signedAt: new Date()
    };

    // Add signature to the letter
    letter.signatures.push(signatureRecord);

    // Generate clean PDF filename (original letter without signatures)
    const cleanPdfFileName = `clean_letter_${letter._id}.pdf`;
    const cleanPdfPath = path.join(process.env.UPLOAD_PATH || './uploads', cleanPdfFileName);

    // Generate signed PDF filename
    const signedPdfFileName = `signed_letter_${letter._id}_${Date.now()}.pdf`;
    const signedPdfPath = path.join(process.env.UPLOAD_PATH || './uploads', signedPdfFileName);

    // Save clean PDF (original letter content without signatures)
    // For now, we'll save the HTML content as a placeholder
    // In a real implementation, you would convert HTML to PDF
    const cleanHtmlContent = cleanLetterContent(letter.content);
    fs.writeFileSync(cleanPdfPath.replace('.pdf', '.html'), cleanHtmlContent, 'utf8');

    // Get faculty profile to fetch stored signature
    const facultyProfile = await FacultyProfile.findOne({ facultyId: facultyId });
    let signatureToUse = null;
    
    if (facultyProfile && facultyProfile.hasSignature) {
      signatureToUse = facultyProfile.signatureUrl;
      console.log('✅ Using signature from faculty profile');
    } else if (signatureData.signature) {
      signatureToUse = signatureData.signature;
      console.log('✅ Using signature from request data');
    } else {
      console.log('⚠️ No signature found, will generate from name');
    }

    // Prepare signature data for PDF generation
    const signatureForPDF = {
      name: signatureData.facultyName,
      role: signatureData.facultyDesignation,
      signature: signatureToUse,
      approvedAt: new Date().toISOString()
    };

    // Generate signed PDF with all signatures
    const allSignatures = [...letter.signatures, signatureRecord];
    const signedPdfResult = await generateSignedPDF(
      cleanPdfPath.replace('.pdf', '.html'), // Use HTML as input for now
      allSignatures,
      signedPdfPath.replace('.pdf', '.html') // Output as HTML for now
    );

    if (!signedPdfResult.success) {
      throw new Error(`Failed to generate signed PDF: ${signedPdfResult.error}`);
    }

    // Check if all required signatures are collected
    const requiredSignatures = [];
    if (letter.assignedMentor) requiredSignatures.push('mentor');
    if (letter.assignedHOD) requiredSignatures.push('hod');
    if (letter.assignedDean) requiredSignatures.push('dean');
    
    const collectedSignatures = letter.signatures.length;
    const isFullySigned = collectedSignatures >= requiredSignatures.length;

    // Update letter with signed document information
    letter.signedDocument = {
      fileName: signedPdfFileName,
      filePath: signedPdfPath,
      originalName: `SIGNED_${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: signedPdfResult.fileSize || 0,
      mimeType: 'application/pdf',
      signedAt: new Date(),
      signedBy: facultyId,
      signatureData: {
        facultyName: signatureData.facultyName,
        facultyDesignation: signatureData.facultyDesignation,
        signature: signatureToUse
      },
      signaturesCount: signedPdfResult.signaturesCount || letter.signatures.length,
      method: signedPdfResult.method || 'pdf_generation'
    };

    // Update letter status - only mark as 'signed' when all required signatures are collected
    if (isFullySigned) {
      letter.status = 'signed';
    } else {
      letter.status = 'approved'; // Keep as approved until all signatures are collected
    }

    await letter.save();

    // Create signing record in document_approvals table
    try {
      const faculty = await User.findById(facultyId).select('name designation role');
      const student = await User.findById(letter.submittedBy).select('name');
      
      await DocumentApproval.createApprovalRecord({
        document_id: letter._id,
        approver_id: facultyId,
        status: 'signed',
        signed_pdf_url: letter.signedDocument?.filePath || null,
        comment: `Signed by ${signatureData.facultyName}`,
        approver_name: faculty.name,
        approver_role: faculty.role,
        approver_designation: faculty.designation || 'Faculty',
        document_title: letter.title,
        student_name: student.name,
        student_id: letter.submittedBy,
        file_name: letter.signedDocument?.fileName || null,
        file_size: letter.signedDocument?.fileSize || 0,
        mime_type: letter.signedDocument?.mimeType || 'application/pdf',
        workflow_step: 'signed',
        is_final_approval: isFullySigned,
        approved_at: new Date(),
        signed_at: new Date()
      });
      
      console.log('✅ Signing record created in document_approvals table');
    } catch (error) {
      console.error('❌ Error creating signing record:', error);
      // Don't fail the signing if record creation fails
    }

    // Broadcast signing update via WebSocket
    const faculty = await User.findById(facultyId).select('name designation');
    webSocketService.broadcastApprovalUpdate({
      letterId: letter._id,
      studentId: letter.submittedBy,
      facultyId: facultyId,
      status: 'signed',
      approverName: faculty.name,
      approverRole: faculty.designation || 'Faculty',
      workflowStep: 'signed',
      signedAt: new Date()
    });

    res.json({
      success: true,
      message: isFullySigned ? 'Letter fully signed and PDF generated successfully' : 'Signature added successfully. Letter will be fully signed when all required signatures are collected.',
      data: {
        letter: letter,
        signedDocument: letter.signedDocument,
        signaturesCount: letter.signatures.length,
        requiredSignatures: requiredSignatures.length,
        isFullySigned: isFullySigned
      }
    });

  } catch (error) {
    console.error('Error signing letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sign letter'
    });
  }
}));

// @route   GET /api/letters/:id/download
// @desc    Download letter content
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;
    const userId = req.user._id;

    // Find the letter
    const letter = await Letter.findById(letterId);
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if user has permission to download this letter
    const canDownload = letter.submittedBy.toString() === userId || 
                       letter.assignedMentor?.toString() === userId ||
                       letter.assignedHOD?.toString() === userId ||
                       letter.assignedDean?.toString() === userId ||
                       req.user.role === 'admin';

    if (!canDownload) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this letter'
      });
    }

    // Create HTML content for the letter
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${letter.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .letter-container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .letter-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .letter-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .letter-meta {
            color: #666;
            font-size: 14px;
        }
        .letter-content {
            white-space: pre-wrap;
            font-size: 16px;
            line-height: 1.8;
            color: #333;
        }
        .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            width: 200px;
            margin: 20px 0 5px 0;
        }
        .signature-label {
            font-size: 12px;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-approved { background-color: #d4edda; color: #155724; }
        .status-signed { background-color: #cce5ff; color: #004085; }
        .status-rejected { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="letter-container">
        <div class="letter-header">
            <div class="letter-title">${letter.title}</div>
            <div class="letter-meta">
                <span class="status-badge status-${letter.status}">${letter.status}</span>
                <br>
                Submitted: ${new Date(letter.submittedAt).toLocaleDateString()}
                ${letter.approvedAt ? `<br>Approved: ${new Date(letter.approvedAt).toLocaleDateString()}` : ''}
            </div>
        </div>
        
        <div class="letter-content">${letter.content}</div>
        
        ${letter.status === 'signed' && letter.signedDocument ? `
        <div class="signature-section">
            <div class="signature-label">Signed on: ${new Date(letter.signedDocument.signedAt).toLocaleDateString()}</div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    // Set response headers for download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${letter.title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`);
    
    // Send the HTML content
    res.send(htmlContent);

  } catch (error) {
    console.error('Error downloading letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download letter'
    });
  }
}));

// @route   POST /api/letters/:id/reminder
// @desc    Send reminder to faculty for pending letter approval
// @access  Private
router.post('/:id/reminder', [
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reminder message must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const studentId = req.user._id;

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Find the letter
    const letter = await Letter.findById(id).populate('assignedMentor assignedHOD assignedDean');
    
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    // Check if the student owns this letter
    if (letter.studentId.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only send reminders for your own letters'
      });
    }

    // Check if letter is still pending
    if (letter.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only send reminders for pending letters'
      });
    }

    // Check if reminder was sent recently (within last 24 hours)
    const lastReminder = letter.lastReminderSent;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (lastReminder && lastReminder > oneDayAgo) {
      return res.status(429).json({
        success: false,
        message: 'You can only send one reminder per day. Please wait before sending another reminder.'
      });
    }

    // Determine who to send reminder to based on current approval stage
    let recipient = null;
    let recipientRole = '';

    if (letter.assignedMentor && !letter.mentorApproved) {
      recipient = letter.assignedMentor;
      recipientRole = 'Mentor';
    } else if (letter.assignedHOD && !letter.hodApproved) {
      recipient = letter.assignedHOD;
      recipientRole = 'Head of Department';
    } else if (letter.assignedDean && !letter.deanApproved) {
      recipient = letter.assignedDean;
      recipientRole = 'Dean';
    }

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'No faculty member found to send reminder to'
      });
    }

    // Update letter with reminder timestamp
    letter.lastReminderSent = now;
    letter.reminderCount = (letter.reminderCount || 0) + 1;
    await letter.save();

    // Create reminder message
    const defaultMessage = `Dear ${recipientRole},\n\nThis is a friendly reminder regarding my letter "${letter.title}" which was submitted on ${new Date(letter.createdAt).toLocaleDateString()}. I would appreciate if you could review and approve it at your earliest convenience.\n\nThank you for your time.\n\nBest regards,\n${req.user.name}`;
    
    const reminderMessage = message || defaultMessage;

    // In a real application, you would send email/SMS here
    // For now, we'll just log the reminder
    console.log(`📧 REMINDER SENT:`);
    console.log(`   From: ${req.user.name} (${req.user.email})`);
    console.log(`   To: ${recipient.name} (${recipient.email}) - ${recipientRole}`);
    console.log(`   Letter: ${letter.title} (ID: ${letter._id})`);
    console.log(`   Message: ${reminderMessage}`);
    console.log(`   Reminder Count: ${letter.reminderCount}`);

    res.json({
      success: true,
      message: 'Reminder sent successfully',
      data: {
        recipient: {
          name: recipient.name,
          email: recipient.email,
          role: recipientRole
        },
        reminderCount: letter.reminderCount,
        lastReminderSent: letter.lastReminderSent,
        nextReminderAllowed: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder'
    });
  }
}));

// @route   GET /api/letters/approval-history/:facultyId
// @desc    Get faculty approval history
// @access  Private (Faculty/Admin)
router.get('/approval-history/:facultyId', asyncHandler(async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { status, limit = 50, skip = 0, sortBy = 'approved_at', sortOrder = 'desc' } = req.query;

    // Check if user is authorized to view this faculty's history
    const canView = (
      req.user._id === facultyId || 
      req.user.role === 'admin'
    );

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this faculty\'s approval history'
      });
    }

    // Get approval history
    const result = await DocumentApproval.getFacultyApprovalHistory(facultyId, {
      status: status || null,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: {
        approvals: result.approvals,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          total: result.totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching faculty approval history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history'
    });
  }
}));

// @route   GET /api/letters/approval-history
// @desc    Get current user's approval history
// @access  Private (Faculty)
router.get('/approval-history', asyncHandler(async (req, res) => {
  try {
    const { status, limit = 50, skip = 0, sortBy = 'approved_at', sortOrder = 'desc' } = req.query;
    const facultyId = req.user._id;

    // Get approval history for current user
    const result = await DocumentApproval.getFacultyApprovalHistory(facultyId, {
      status: status || null,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: {
        approvals: result.approvals,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          total: result.totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history'
    });
  }
}));

// @route   GET /api/letters/:id/approval-history
// @desc    Get document approval history
// @access  Private
router.get('/:id/approval-history', asyncHandler(async (req, res) => {
  try {
    const letterId = req.params.id;

    // Check if user has permission to view this document's history
    const letter = await Letter.findById(letterId);
    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Letter not found'
      });
    }

    const submittedById = letter.submittedBy?._id?.toString() || letter.submittedBy?.toString();
    const canView = (
      submittedById === req.user._id ||
      letter.assignedMentor?.toString() === req.user._id ||
      letter.assignedHOD?.toString() === req.user._id ||
      letter.assignedDean?.toString() === req.user._id ||
      req.user.role === 'admin'
    );

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this document\'s approval history'
      });
    }

    // Get document approval history
    const approvals = await DocumentApproval.getDocumentApprovalHistory(letterId);

    res.json({
      success: true,
      data: {
        documentId: letterId,
        documentTitle: letter.title,
        approvals: approvals
      }
    });

  } catch (error) {
    console.error('Error fetching document approval history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document approval history'
    });
  }
}));

export default router;
