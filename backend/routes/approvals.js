import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireFacultyOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/approvals/pending
// @desc    Get pending documents for faculty
// @access  Private (faculty only)
router.get('/pending', requireFacultyOrAdmin, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  query('documentType')
    .optional()
    .isIn(['assignment', 'project', 'certificate', 'transcript', 'other'])
    .withMessage('Invalid document type')
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
    page = 1,
    limit = 10,
    priority,
    documentType,
    search
  } = req.query;

  // Build filter for pending documents assigned to the faculty
  const filter = {
    status: 'pending',
    assignedTo: req.user._id
  };

  if (priority) filter.priority = priority;
  if (documentType) filter.documentType = documentType;

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

  // Get pending documents with pagination
  const documents = await Document.find(filter)
    .populate('submittedBy', 'name email role vtuId facultyId')
    .populate('assignedTo', 'name email role')
    .sort({ priority: -1, submittedAt: 1 }) // High priority first, then by submission date
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

// @route   POST /api/approvals/:id/approve
// @desc    Approve a document
// @access  Private (faculty only)
router.post('/:id/approve', requireFacultyOrAdmin, [
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

  // Check if document is assigned to the faculty
  if (document.assignedTo.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Document not assigned to you'
    });
  }

  // Check if document is pending
  if (document.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Document is not pending approval'
    });
  }

  // Approve document
  await document.approve(req.user._id);

  // Add approval comment if provided
  if (req.body.comment) {
    await document.addComment(req.user._id, `Approved: ${req.body.comment}`);
  }

  // Populate user details
  await document.populate('submittedBy', 'name email role');
  await document.populate('assignedTo', 'name email role');
  await document.populate('approvedBy', 'name email role');
  await document.populate('comments.user', 'name email role');

  res.json({
    success: true,
    message: 'Document approved successfully',
    data: {
      document
    }
  });
}));

// @route   POST /api/approvals/:id/reject
// @desc    Reject a document
// @access  Private (faculty only)
router.post('/:id/reject', requireFacultyOrAdmin, [
  body('reason')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason is required and must be less than 500 characters'),
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

  // Check if document is assigned to the faculty
  if (document.assignedTo.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Document not assigned to you'
    });
  }

  // Check if document is pending
  if (document.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Document is not pending approval'
    });
  }

  const { reason, comment } = req.body;

  // Reject document
  await document.reject(req.user._id, reason);

  // Add rejection comment if provided
  if (comment) {
    await document.addComment(req.user._id, `Rejected: ${comment}`);
  }

  // Populate user details
  await document.populate('submittedBy', 'name email role');
  await document.populate('assignedTo', 'name email role');
  await document.populate('rejectedBy', 'name email role');
  await document.populate('comments.user', 'name email role');

  res.json({
    success: true,
    message: 'Document rejected successfully',
    data: {
      document
    }
  });
}));

// @route   GET /api/approvals/stats
// @desc    Get approval statistics for faculty
// @access  Private (faculty only)
router.get('/stats', requireFacultyOrAdmin, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get counts for different statuses
  const pendingCount = await Document.countDocuments({
    status: 'pending',
    assignedTo: userId
  });

  const approvedCount = await Document.countDocuments({
    status: 'approved',
    assignedTo: userId
  });

  const rejectedCount = await Document.countDocuments({
    status: 'rejected',
    assignedTo: userId
  });

  // Get priority distribution
  const priorityStats = await Document.aggregate([
    {
      $match: {
        assignedTo: userId,
        status: 'pending'
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get document type distribution
  const typeStats = await Document.aggregate([
    {
      $match: {
        assignedTo: userId,
        status: 'pending'
      }
    },
    {
      $group: {
        _id: '$documentType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get overdue documents count
  const overdueCount = await Document.countDocuments({
    assignedTo: userId,
    status: 'pending',
    dueDate: { $lt: new Date() }
  });

  // Get average processing time for approved documents
  const avgProcessingTime = await Document.aggregate([
    {
      $match: {
        assignedTo: userId,
        status: 'approved',
        approvedAt: { $exists: true }
      }
    },
    {
      $addFields: {
        processingTime: {
          $subtract: ['$approvedAt', '$submittedAt']
        }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$processingTime' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        overdue: overdueCount
      },
      priorityDistribution: priorityStats,
      typeDistribution: typeStats,
      averageProcessingTime: avgProcessingTime[0]?.avgTime || 0
    }
  });
}));

// @route   GET /api/approvals/history
// @desc    Get approval history for faculty
// @access  Private (faculty only)
router.get('/history', requireFacultyOrAdmin, [
  query('status')
    .optional()
    .isIn(['approved', 'rejected'])
    .withMessage('Invalid status'),
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
    page = 1,
    limit = 10
  } = req.query;

  // Build filter for processed documents
  const filter = {
    assignedTo: req.user._id,
    status: { $in: ['approved', 'rejected'] }
  };

  if (status) {
    filter.status = status;
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get processed documents with pagination
  const documents = await Document.find(filter)
    .populate('submittedBy', 'name email role vtuId facultyId')
    .populate('assignedTo', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('rejectedBy', 'name email role')
    .sort({ updatedAt: -1 })
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

export default router;
