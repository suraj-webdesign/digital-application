import express from 'express';
import { query, validationResult } from 'express-validator';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics (admin only)
// @access  Private (admin only)
router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
  // Get overall system statistics
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalDocuments = await Document.countDocuments();
  const pendingDocuments = await Document.countDocuments({ status: 'pending' });
  const approvedDocuments = await Document.countDocuments({ status: 'approved' });
  const rejectedDocuments = await Document.countDocuments({ status: 'rejected' });

  // Get user role distribution
  const userRoleStats = await User.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get document type distribution
  const documentTypeStats = await Document.aggregate([
    {
      $group: {
        _id: '$documentType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get document status distribution
  const documentStatusStats = await Document.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentUsers = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  const recentDocuments = await Document.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // Get average processing time for approved documents
  const avgProcessingTime = await Document.aggregate([
    {
      $match: {
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
      overview: {
        totalUsers,
        totalDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments
      },
      userRoleDistribution: userRoleStats,
      documentTypeDistribution: documentTypeStats,
      documentStatusDistribution: documentStatusStats,
      recentActivity: {
        newUsers: recentUsers,
        newDocuments: recentDocuments
      },
      averageProcessingTime: avgProcessingTime[0]?.avgTime || 0
    }
  });
}));

// @route   GET /api/analytics/documents
// @desc    Get document analytics (admin only)
// @access  Private (admin only)
router.get('/documents', requireAdmin, [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'all'])
    .withMessage('Invalid period'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Invalid groupBy value')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { period = '30d', groupBy = 'day' } = req.query;

  // Calculate date range
  let startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate = new Date(0); // Unix epoch
      break;
  }

  // Get document submission trends
  const submissionTrends = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupBy === 'day' ? '%Y-%m-%d' : 
                   groupBy === 'week' ? '%Y-%U' : '%Y-%m',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Get document approval trends
  const approvalTrends = await Document.aggregate([
    {
      $match: {
        approvedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupBy === 'day' ? '%Y-%m-%d' : 
                   groupBy === 'week' ? '%Y-%U' : '%Y-%m',
            date: '$approvedAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Get document type trends
  const typeTrends = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          documentType: '$documentType',
          date: {
            $dateToString: {
              format: groupBy === 'day' ? '%Y-%m-%d' : 
                     groupBy === 'week' ? '%Y-%U' : '%Y-%m',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1, '_id.documentType': 1 }
    }
  ]);

  // Get priority distribution
  const priorityDistribution = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get overdue documents count
  const overdueCount = await Document.countDocuments({
    status: 'pending',
    dueDate: { $lt: new Date() }
  });

  res.json({
    success: true,
    data: {
      period,
      groupBy,
      submissionTrends,
      approvalTrends,
      typeTrends,
      priorityDistribution,
      overdueCount
    }
  });
}));

// @route   GET /api/analytics/users
// @desc    Get user analytics (admin only)
// @access  Private (admin only)
router.get('/users', requireAdmin, [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'all'])
    .withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { period = '30d' } = req.query;

  // Calculate date range
  let startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate = new Date(0);
      break;
  }

  // Get user registration trends
  const registrationTrends = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Get user activity (last login)
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: startDate }
  });

  // Get users with signatures
  const usersWithSignatures = await User.countDocuments({
    signature: { $exists: true, $ne: null }
  });

  // Get department distribution
  const departmentDistribution = await User.aggregate([
    {
      $match: {
        department: { $exists: true, $ne: null },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Get user engagement (users who have submitted documents)
  const engagedUsers = await User.aggregate([
    {
      $lookup: {
        from: 'documents',
        localField: '_id',
        foreignField: 'submittedBy',
        as: 'submittedDocuments'
      }
    },
    {
      $match: {
        'submittedDocuments.0': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      period,
      registrationTrends,
      activeUsers,
      usersWithSignatures,
      departmentDistribution,
      engagedUsers
    }
  });
}));

// @route   GET /api/analytics/performance
// @desc    Get system performance analytics (admin only)
// @access  Private (admin only)
router.get('/performance', requireAdmin, asyncHandler(async (req, res) => {
  // Get average processing time by document type
  const avgProcessingTimeByType = await Document.aggregate([
    {
      $match: {
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
        _id: '$documentType',
        avgTime: { $avg: '$processingTime' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get faculty performance (approval rate)
  const facultyPerformance = await Document.aggregate([
    {
      $match: {
        assignedTo: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        totalAssigned: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'faculty'
      }
    },
    {
      $unwind: '$faculty'
    },
    {
      $project: {
        facultyName: '$faculty.name',
        facultyEmail: '$faculty.email',
        totalAssigned: 1,
        approved: 1,
        rejected: 1,
        pending: 1,
        approvalRate: {
          $multiply: [
            {
              $divide: [
                '$approved',
                { $subtract: ['$totalAssigned', '$pending'] }
              ]
            },
            100
          ]
        }
      }
    },
    {
      $sort: { approvalRate: -1 }
    }
  ]);

  // Get system load (documents per day)
  const systemLoad = await Document.aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        documentsCreated: { $sum: 1 },
        documentsApproved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        documentsRejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id': -1 }
    },
    {
      $limit: 30 // Last 30 days
    }
  ]);

  res.json({
    success: true,
    data: {
      avgProcessingTimeByType,
      facultyPerformance,
      systemLoad
    }
  });
}));

// @route   GET /api/analytics/system-stats
// @desc    Get system statistics for admin dashboard
// @access  Private (admin only)
router.get('/system-stats', requireAdmin, asyncHandler(async (req, res) => {
  // Get basic counts
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const totalDocuments = await Document.countDocuments();
  const pendingDocuments = await Document.countDocuments({ status: 'pending' });
  const approvedDocuments = await Document.countDocuments({ status: 'approved' });
  const rejectedDocuments = await Document.countDocuments({ status: 'rejected' });

  // Get user role distribution
  const userRoleStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent activity (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentUsers = await User.countDocuments({
    createdAt: { $gte: oneDayAgo }
  });

  const recentDocuments = await Document.countDocuments({
    createdAt: { $gte: oneDayAgo }
  });

  // Get system health indicators
  const avgProcessingTime = await Document.aggregate([
    {
      $match: {
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
      stats: {
        totalUsers,
        activeUsers,
        totalDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
        recentUsers,
        recentDocuments,
        avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
        userRoleDistribution: userRoleStats
      }
    }
  });
}));

export default router;
