import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import FacultyProfile from '../models/FacultyProfile.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireFacultyOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/signatures/upload
// @desc    Upload digital signature for faculty
// @access  Private (faculty only)
router.post('/upload', requireFacultyOrAdmin, [
  body('signature')
    .notEmpty()
    .withMessage('Signature data is required')
    .custom((value) => {
      // Accept either data URL or base64 string
      if (value.startsWith('data:image/') || value.match(/^[A-Za-z0-9+/]+=*$/)) {
        return true;
      }
      throw new Error('Signature must be a data URL or valid base64 encoded data');
    })
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  let { signature } = req.body;

  // Validate signature data size (max 5MB)
  const signatureSize = Buffer.byteLength(signature, 'base64');
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (signatureSize > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'Signature file is too large. Maximum size is 5MB.'
    });
  }

  // Validate that the signature is an image (either data URL or base64)
  if (!signature.startsWith('data:image/') && !signature.match(/^[A-Za-z0-9+/]+=*$/)) {
    return res.status(400).json({
      success: false,
      message: 'Signature must be an image file (JPEG, PNG, GIF) or valid base64 data'
    });
  }

  // Convert base64 to data URL if needed
  if (!signature.startsWith('data:image/')) {
    signature = `data:image/png;base64,${signature}`;
  }

  // Get or create faculty profile
  const facultyProfile = await FacultyProfile.getOrCreateProfile(req.user._id);
  
  // Update signature in faculty profile
  await facultyProfile.updateSignature(signature);
  
  // Also update user's signature for backward compatibility
  const user = await User.findById(req.user._id);
  user.signature = signature;
  user.signatureUploadedAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Digital signature uploaded successfully',
    data: {
      signatureUploadedAt: facultyProfile.signatureUploadedAt,
      hasSignature: true,
      signatureUrl: facultyProfile.signatureUrl
    }
  });
}));

// @route   GET /api/signatures/status
// @desc    Get signature status for faculty
// @access  Private (faculty only)
router.get('/status', requireFacultyOrAdmin, asyncHandler(async (req, res) => {
  const facultyProfile = await FacultyProfile.getOrCreateProfile(req.user._id);
  
  res.json({
    success: true,
    data: {
      hasSignature: facultyProfile.hasSignature,
      signatureUploadedAt: facultyProfile.signatureUploadedAt,
      signatureUrl: facultyProfile.signatureUrl,
      isSignatureActive: facultyProfile.isSignatureActive,
      signatureSize: facultyProfile.signatureUrl ? Buffer.byteLength(facultyProfile.signatureUrl, 'base64') : 0
    }
  });
}));

// @route   DELETE /api/signatures/remove
// @desc    Remove digital signature for faculty
// @access  Private (faculty only)
router.delete('/remove', requireFacultyOrAdmin, asyncHandler(async (req, res) => {
  const facultyProfile = await FacultyProfile.getOrCreateProfile(req.user._id);
  
  if (!facultyProfile.hasSignature) {
    return res.status(400).json({
      success: false,
      message: 'No signature found to remove'
    });
  }

  // Remove signature from faculty profile
  await facultyProfile.removeSignature();
  
  // Also remove from user for backward compatibility
  const user = await User.findById(req.user._id);
  user.signature = null;
  user.signatureUploadedAt = null;
  await user.save();

  res.json({
    success: true,
    message: 'Digital signature removed successfully'
  });
}));

// @route   GET /api/signatures/profile/:userId
// @desc    Get signature from faculty profile (for document signing)
// @access  Private (authenticated users)
router.get('/profile/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if the requesting user has permission to view this signature
  if (req.user.role === 'student' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const facultyProfile = await FacultyProfile.findOne({ facultyId: userId });
  
  if (!facultyProfile) {
    return res.status(404).json({
      success: false,
      message: 'Faculty profile not found'
    });
  }

  if (!facultyProfile.hasSignature) {
    return res.status(404).json({
      success: false,
      message: 'No active signature found for this faculty member'
    });
  }

  const user = await User.findById(userId).select('name role designation');
  
  res.json({
    success: true,
    data: {
      signature: facultyProfile.signatureUrl,
      signatureUploadedAt: facultyProfile.signatureUploadedAt,
      isSignatureActive: facultyProfile.isSignatureActive,
      userName: user.name,
      userRole: user.role,
      userDesignation: user.designation
    }
  });
}));

// @route   GET /api/signatures/analytics
// @desc    Get signature usage analytics for faculty
// @access  Private (faculty only)
router.get('/analytics', requireFacultyOrAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user.signature) {
    return res.json({
      success: true,
      data: {
        hasSignature: false,
        message: 'No signature uploaded yet'
      }
    });
  }

  // In a real implementation, you would track:
  // - Number of documents signed
  // - Signature usage frequency
  // - Documents signed by type
  // - Time-based usage patterns

  // For now, return basic signature info
  res.json({
    success: true,
    data: {
      hasSignature: true,
      signatureUploadedAt: user.signatureUploadedAt,
      signatureAge: Date.now() - user.signatureUploadedAt.getTime(),
      signatureSize: Buffer.byteLength(user.signature, 'base64'),
      // Mock analytics data
      documentsSigned: 0,
      lastUsed: null,
      usageFrequency: 'none'
    }
  });
}));

// @route   GET /api/signatures/:userId
// @desc    Get signature for a specific user (for document verification) - Legacy route
// @access  Private (authenticated users)
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if the requesting user has permission to view this signature
  if (req.user.role === 'student' && req.user._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Try to get from faculty profile first
  const facultyProfile = await FacultyProfile.findOne({ facultyId: userId });
  
  if (facultyProfile && facultyProfile.hasSignature) {
    const user = await User.findById(userId).select('name role designation');
    return res.json({
      success: true,
      data: {
        signature: facultyProfile.signatureUrl,
        signatureUploadedAt: facultyProfile.signatureUploadedAt,
        userName: user.name,
        userRole: user.role,
        userDesignation: user.designation
      }
    });
  }

  // Fallback to user signature for backward compatibility
  const user = await User.findById(userId).select('signature signatureUploadedAt name role');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (!user.signature) {
    return res.status(404).json({
      success: false,
      message: 'No signature found for this user'
    });
  }

  res.json({
    success: true,
    data: {
      signature: user.signature,
      signatureUploadedAt: user.signatureUploadedAt,
      userName: user.name,
      userRole: user.role
    }
  });
}));

// @route   POST /api/signatures/verify
// @desc    Verify signature integrity
// @access  Private (authenticated users)
router.post('/verify', [
  body('signature')
    .notEmpty()
    .withMessage('Signature data is required'),
  body('documentId')
    .notEmpty()
    .withMessage('Document ID is required'),
  body('checksum')
    .notEmpty()
    .withMessage('Document checksum is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { signature, documentId, checksum } = req.body;

  // In a real implementation, you would:
  // 1. Verify the document checksum against stored checksum
  // 2. Verify the signature against the user's stored signature
  // 3. Check if the signature was applied by an authorized faculty member
  // 4. Verify the timestamp and other metadata

  // For now, we'll return a mock verification result
  const verificationResult = {
    isValid: true,
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
    documentId,
    signatureIntegrity: 'verified',
    documentIntegrity: 'verified',
    timestamp: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Signature verification completed',
    data: {
      verification: verificationResult
    }
  });
}));

export default router;
