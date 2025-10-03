import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { body, validationResult, query } from 'express-validator';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireFacultyOrAdmin, requireAdmin } from '../middleware/auth.js';
import PythonSignatureService from '../utils/pythonSignatureService.js';

const router = express.Router();

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
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only one file per request
  }
});

// @route   POST /api/documents/upload
// @desc    Upload a new document
// @access  Private
router.post('/upload', upload.single('file'), [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('assignedMentor')
    .optional()
    .isMongoId()
    .withMessage('Valid mentor ID is required'),
  body('assignedHOD')
    .optional()
    .isMongoId()
    .withMessage('Valid HOD ID is required'),
  body('assignedDean')
    .optional()
    .isMongoId()
    .withMessage('Valid Dean ID is required')
], asyncHandler(async (req, res) => {
  console.log('📥 Document upload request received');
  console.log('📥 Request body:', req.body);
  console.log('📥 Request file:', req.file);
  console.log('📥 Request headers:', req.headers);
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Document file is required'
    });
  }

  const {
    description,
    assignedMentor,
    assignedHOD,
    assignedDean
  } = req.body;

  // Verify assigned faculty members exist and are faculty
  const assignedFaculty = [];
  if (assignedMentor) {
    const mentor = await User.findById(assignedMentor);
    if (!mentor || mentor.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'Invalid mentor assigned'
      });
    }
    assignedFaculty.push(mentor);
  }

  if (assignedHOD) {
    const hod = await User.findById(assignedHOD);
    if (!hod || hod.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'Invalid HOD assigned'
      });
    }
    assignedFaculty.push(hod);
  }

  if (assignedDean) {
    const dean = await User.findById(assignedDean);
    if (!dean || dean.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Dean assigned'
      });
    }
    assignedFaculty.push(dean);
  }

  // Calculate file checksum for integrity
  const fileBuffer = fs.readFileSync(req.file.path);
  const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

  // Determine current approver (first in workflow)
  let currentApprover = null;
  if (assignedMentor) {
    currentApprover = assignedMentor;
  } else if (assignedHOD) {
    currentApprover = assignedHOD;
  } else if (assignedDean) {
    currentApprover = assignedDean;
  }

  // Create document
  const document = new Document({
    title: req.file.originalname, // Use filename as title
    description,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    documentType: 'other', // Default type
    submittedBy: req.user._id,
    assignedTo: currentApprover, // Set the current approver as assignedTo
    assignedMentor: assignedMentor || null,
    assignedHOD: assignedHOD || null,
    assignedDean: assignedDean || null,
    currentApprover,
    workflowStep: assignedMentor ? 'mentor' : (assignedHOD ? 'hod' : 'dean'),
    metadata: {
      checksum,
      version: '1.0',
      language: 'en'
    }
  });

  await document.save();

  // Populate user details
  await document.populate('submittedBy', 'name email role');
  await document.populate('assignedTo', 'name email role');

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      document
    }
  });
}));

// @route   GET /api/documents/:id/download
// @desc    Download original document file
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if user has access to this document
    const hasAccess = document.submittedBy.toString() === userId || 
                     document.assignedMentor?.toString() === userId ||
                     document.assignedHOD?.toString() === userId ||
                     document.assignedDean?.toString() === userId ||
                     req.user.role === 'admin';
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if file exists
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
}));

// @route   GET /api/documents/:id/download-signed
// @desc    Download signed document file (with Python processing if available)
// @access  Private
router.get('/:id/download-signed', asyncHandler(async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if user has access to this document
    const hasAccess = document.submittedBy.toString() === userId || 
                     document.assignedMentor?.toString() === userId ||
                     document.assignedHOD?.toString() === userId ||
                     document.assignedDean?.toString() === userId ||
                     req.user.role === 'admin';
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if document is signed
    if (document.status !== 'signed' || !document.signedDocument) {
      return res.status(400).json({
        success: false,
        message: 'Document is not signed yet'
      });
    }
    
    // Check if signed file exists
    const signedFilePath = document.signedDocument.filePath;
    if (!fs.existsSync(signedFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Signed file not found on server'
      });
    }
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', document.signedDocument.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.signedDocument.originalName}"`);
    
    // Stream the signed file
    const fileStream = fs.createReadStream(signedFilePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading signed document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download signed document'
    });
  }
}));

// @route   GET /api/documents/my
// @desc    Get current user's documents
// @access  Private
router.get('/my', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    const documents = await Document.find({ submittedBy: userId })
      .populate('submittedBy', 'name email role vtuId facultyId')
      .populate('approvedBy', 'name email role')
      .populate('assignedMentor', 'name email designation')
      .populate('assignedHOD', 'name email designation')
      .populate('assignedDean', 'name email designation')
      .populate('currentApprover', 'name email designation')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        documents,
        count: documents.length
      }
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user documents'
    });
  }
}));

// @route   GET /api/documents/assigned
// @desc    Get documents assigned to current faculty member
// @access  Private (Faculty only)
router.get('/assigned', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find documents where current user is the current approver
    const documents = await Document.find({
      currentApprover: userId,
      status: 'pending'
    })
      .populate('submittedBy', 'name email role vtuId facultyId department')
      .populate('assignedMentor', 'name email designation')
      .populate('assignedHOD', 'name email designation')
      .populate('assignedDean', 'name email designation')
      .populate('currentApprover', 'name email designation')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        documents,
        count: documents.length
      }
    });
  } catch (error) {
    console.error('Error fetching assigned documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned documents'
    });
  }
}));

// @route   GET /api/documents
// @desc    Get all documents (with filtering and pagination)
// @access  Private
router.get('/', [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'archived'])
    .withMessage('Invalid status'),
  query('documentType')
    .optional()
    .isIn(['assignment', 'project', 'certificate', 'transcript', 'other'])
    .withMessage('Invalid document type'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    status,
    documentType,
    priority,
    search,
    page = 1,
    limit = 10
  } = req.query;

  // Build filter object
  const filter = {};

  // Role-based filtering
  if (req.user.role === 'student') {
    filter.submittedBy = req.user._id;
  } else if (req.user.role === 'faculty') {
    filter.assignedTo = req.user._id;
  }
  // Admin can see all documents

  if (status) filter.status = status;
  if (documentType) filter.documentType = documentType;
  if (priority) filter.priority = priority;

  // Search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get documents with pagination
  const documents = await Document.find(filter)
    .populate('submittedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Document.countDocuments(filter);

  res.json({
    success: true,
    data: {
      documents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalDocuments: total,
        hasNextPage: skip + documents.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

// @route   GET /api/documents/all
// @desc    Get all documents (admin only)
// @access  Private (admin only)
router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  const documents = await Document.find({})
    .populate('submittedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('approvedBy', 'name email role')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: {
      documents: documents.map(doc => ({
        _id: doc._id,
        title: doc.title,
        status: doc.status,
        submittedBy: doc.submittedBy?.name || 'Unknown',
        submittedAt: doc.submittedAt,
        fileName: doc.fileName,
        documentType: doc.documentType,
        priority: doc.priority,
        dueDate: doc.dueDate,
        assignedTo: doc.assignedTo?.name || 'Unassigned',
        approvedBy: doc.approvedBy?.name,
        approvedAt: doc.approvedAt
      }))
    }
  });
}));

// @route   GET /api/documents/:id
// @desc    Get document by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('submittedBy', 'name email role')
    .populate('assignedTo', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('rejectedBy', 'name email role')
    .populate('comments.user', 'name email role');

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'student' && document.submittedBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'faculty' && document.assignedTo._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: {
      document
    }
  });
}));

// @route   PUT /api/documents/:id
// @desc    Update document
// @access  Private (owner or faculty)
router.put('/:id', [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const document = await Document.findById(req.params.id);
  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check permissions
  if (req.user.role === 'student' && document.submittedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'faculty' && document.assignedTo.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Only allow updates if document is pending
  if (document.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update document that is not pending'
    });
  }

  // Update fields
  const updateFields = ['title', 'description', 'priority', 'dueDate', 'tags'];
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'dueDate' && req.body[field]) {
        document[field] = new Date(req.body[field]);
      } else {
        document[field] = req.body[field];
      }
    }
  });

  await document.save();

  // Populate user details
  await document.populate('submittedBy', 'name email role');
  await document.populate('assignedTo', 'name email role');

  res.json({
    success: true,
    message: 'Document updated successfully',
    data: {
      document
    }
  });
}));

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private (owner only)
router.delete('/:id', asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Only document owner can delete
  if (document.submittedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Only allow deletion if document is pending
  if (document.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete document that is not pending'
    });
  }

  // Delete file from filesystem
  if (fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }

  await document.deleteOne();

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

// @route   POST /api/documents/:id/comments
// @desc    Add comment to document
// @access  Private
router.post('/:id/comments', [
  body('comment')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const document = await Document.findById(req.params.id);
  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'student' && document.submittedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (req.user.role === 'faculty' && document.assignedTo.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Add comment
  await document.addComment(req.user._id, req.body.comment);

  // Populate comment user details
  await document.populate('comments.user', 'name email role');

  res.json({
    success: true,
    message: 'Comment added successfully',
    data: {
      document
    }
  });
}));

// @route   POST /api/documents/:id/approve
// @desc    Approve document and move to next workflow step
// @access  Private (Faculty/Admin)
router.post('/:id/approve', requireFacultyOrAdmin, asyncHandler(async (req, res) => {
  try {
    const documentId = req.params.id;
    const facultyId = req.user.id;

    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if faculty has permission to approve this document at current step
    const canApprove = document.currentApprover?.toString() === facultyId || req.user.role === 'admin';

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to approve this document at this stage'
      });
    }

    // Determine next workflow step
    let nextApprover = null;
    let nextWorkflowStep = 'completed';
    let newStatus = 'approved';

    if (document.workflowStep === 'mentor' && document.assignedHOD) {
      // Move from mentor to HOD
      nextApprover = document.assignedHOD;
      nextWorkflowStep = 'hod';
      newStatus = 'pending';
    } else if (document.workflowStep === 'hod' && document.assignedDean) {
      // Move from HOD to Dean
      nextApprover = document.assignedDean;
      nextWorkflowStep = 'dean';
      newStatus = 'pending';
    } else if (document.workflowStep === 'dean') {
      // Final approval - document is fully approved
      nextWorkflowStep = 'completed';
      newStatus = 'approved';
    } else {
      // No next step - document is approved
      nextWorkflowStep = 'completed';
      newStatus = 'approved';
    }

    // Update document
    document.workflowStep = nextWorkflowStep;
    document.status = newStatus;
    document.currentApprover = nextApprover;

    // Only set final approval details if this is the final step
    if (nextWorkflowStep === 'completed') {
      document.approvedBy = facultyId;
      document.approvedAt = new Date();
    }

    await document.save();

    res.json({
      success: true,
      message: nextWorkflowStep === 'completed' 
        ? 'Document fully approved' 
        : `Document approved, moved to ${nextWorkflowStep} stage`,
      data: {
        document: document,
        nextStep: nextWorkflowStep,
        nextApprover: nextApprover
      }
    });

  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve document'
    });
  }
}));

// @route   POST /api/documents/:id/sign
// @desc    Sign a document and save signed version (only final approver can sign)
// @access  Private (Faculty/Admin)
router.post('/:id/sign', requireFacultyOrAdmin, [
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
    const documentId = req.params.id;
    const { signatureData } = req.body;
    const facultyId = req.user.id;

    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if document is fully approved and faculty is the final approver
    if (document.status !== 'approved' || document.workflowStep !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Document must be fully approved before signing'
      });
    }

    // Only the final approver can sign the document
    const canSign = document.approvedBy?.toString() === facultyId || req.user.role === 'admin';

    if (!canSign) {
      return res.status(403).json({
        success: false,
        message: 'Only the final approver can sign this document'
      });
    }

    // Generate signed document filename
    const signedFileName = `signed_${document.fileName}`;
    const signedFilePath = path.join(process.env.UPLOAD_PATH || './uploads', signedFileName);
    const originalFilePath = path.join(process.env.UPLOAD_PATH || './uploads', document.fileName);

    // Initialize Python signature service
    const pythonService = new PythonSignatureService();

    // Check if Python service is available
    const isPythonAvailable = await pythonService.checkAvailability();
    
    if (isPythonAvailable && fs.existsSync(originalFilePath)) {
      try {
        console.log('🐍 Using Python signature service for PDF processing...');
        
        // Create signature data for Python service
        const pythonSignatureData = [pythonService.createSignatureData(
          {
            name: signatureData.facultyName,
            designation: signatureData.facultyDesignation,
            signature: signatureData.signature
          },
          new Date().toISOString().split('T')[0]
        )];

        // Process signatures using Python service
        const pythonResult = await pythonService.processSignatures(
          originalFilePath,
          signedFilePath,
          pythonSignatureData
        );

        if (pythonResult.success) {
          console.log('✅ Python signature processing successful:', pythonResult);
          
          // Store the signature data in the document
          document.signedDocument = {
            fileName: signedFileName,
            filePath: signedFilePath,
            originalName: `SIGNED_${document.originalName}`,
            fileSize: pythonResult.file_size || 0,
            mimeType: 'application/pdf',
            signedAt: new Date(),
            signedBy: facultyId,
            signatureData: {
              facultyName: signatureData.facultyName,
              facultyDesignation: signatureData.facultyDesignation,
              signature: signatureData.signature
            },
            pythonProcessed: true,
            signaturesCount: pythonResult.signatures_count
          };
        } else {
          throw new Error(`Python processing failed: ${pythonResult.error}`);
        }
      } catch (pythonError) {
        console.error('❌ Python signature processing failed:', pythonError);
        console.log('🔄 Falling back to basic signature storage...');
        
        // Fallback to basic signature storage
        document.signedDocument = {
          fileName: signedFileName,
          filePath: signedFilePath,
          originalName: `SIGNED_${document.originalName}`,
          fileSize: 0,
          mimeType: 'text/html',
          signedAt: new Date(),
          signedBy: facultyId,
          signatureData: {
            facultyName: signatureData.facultyName,
            facultyDesignation: signatureData.facultyDesignation,
            signature: signatureData.signature
          },
          pythonProcessed: false,
          pythonError: pythonError.message
        };
      }
    } else {
      console.log('⚠️ Python service not available or original file not found, using basic signature storage...');
      
      // Store the signature data in the document (basic mode)
      document.signedDocument = {
        fileName: signedFileName,
        filePath: signedFilePath,
        originalName: `SIGNED_${document.originalName}`,
        fileSize: 0,
        mimeType: 'text/html',
        signedAt: new Date(),
        signedBy: facultyId,
        signatureData: {
          facultyName: signatureData.facultyName,
          facultyDesignation: signatureData.facultyDesignation,
          signature: signatureData.signature
        },
        pythonProcessed: false,
        pythonAvailable: isPythonAvailable
      };
    }

    // Update document status to signed (it's already approved)
    document.status = 'signed';

    await document.save();

    res.json({
      success: true,
      message: document.signedDocument.pythonProcessed 
        ? 'Document signed successfully with Python PDF processing' 
        : 'Document signed successfully (basic mode)',
      data: {
        document: document,
        signedDocument: document.signedDocument,
        pythonProcessed: document.signedDocument.pythonProcessed || false,
        signaturesCount: document.signedDocument.signaturesCount || 1
      }
    });

  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sign document'
    });
  }
}));

// @route   GET /api/documents/:id/signed
// @desc    Download signed document
// @access  Private
router.get('/:id/signed', asyncHandler(async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if user has access to this document
    const hasAccess = document.submittedBy.toString() === userId || 
                     document.assignedMentor?.toString() === userId ||
                     document.assignedHOD?.toString() === userId ||
                     document.assignedDean?.toString() === userId ||
                     req.user.role === 'admin';
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if document is signed
    if (!document.signedDocument || !document.signedDocument.fileName) {
      return res.status(404).json({
        success: false,
        message: 'Signed document not found'
      });
    }
    
    // For now, we'll return the signature data to generate the signed document on frontend
    // In a real implementation, you would serve the actual signed file
    res.json({
      success: true,
      data: {
        document: document,
        signedDocument: document.signedDocument,
        originalDocument: {
          fileName: document.fileName,
          originalName: document.originalName,
          mimeType: document.mimeType
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching signed document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signed document'
    });
  }
}));

export default router;
