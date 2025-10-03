import express from 'express';
import { body, validationResult, query } from 'express-validator';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin, requireOwnershipOrAdmin, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.getPublicProfile()
    }
  });
}));

// @route   GET /api/users/faculty-by-department
// @desc    Get faculty members by department and designation
// @access  Private
router.get('/faculty-by-department', asyncHandler(async (req, res) => {
  try {
    const { department, designation } = req.query;
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    const query = {
      role: 'faculty',
      department: department,
      isActive: true
    };

    // If designation is specified, filter by it
    if (designation) {
      query.designation = designation;
    }

    const faculty = await User.find(query)
      .select('name email designation department facultyId')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        faculty,
        count: faculty.length
      }
    });
  } catch (error) {
    console.error('Error fetching faculty by department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty members'
    });
  }
}));

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must be less than 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Student ID must be less than 50 characters'),
  body('year')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Year must be less than 20 characters'),
  body('semester')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Semester must be less than 20 characters'),
  body('specialization')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Specialization must be less than 100 characters')
], asyncHandler(async (req, res) => {
  console.log('📤 Backend: Profile update request received');
  console.log('📤 Backend: User ID:', req.user._id);
  console.log('📤 Backend: Request body:', req.body);
  
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Backend: Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { 
    name, 
    email, 
    phone, 
    address, 
    designation, 
    department, 
    studentId, 
    year, 
    semester, 
    specialization 
  } = req.body;

  console.log('📤 Backend: Updating fields:', {
    name, email, phone, address, designation, department, studentId, year, semester, specialization
  });

  // Update fields
  if (name !== undefined) req.user.name = name;
  if (email !== undefined) req.user.email = email;
  if (phone !== undefined) req.user.phone = phone;
  if (address !== undefined) req.user.address = address;
  if (designation !== undefined) req.user.designation = designation;
  if (department !== undefined) req.user.department = department;
  if (studentId !== undefined) req.user.studentId = studentId;
  if (year !== undefined) req.user.year = year;
  if (semester !== undefined) req.user.semester = semester;
  if (specialization !== undefined) req.user.specialization = specialization;

  console.log('📤 Backend: Saving user...');
  await req.user.save();
  console.log('✅ Backend: User saved successfully');

  const response = {
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: req.user.getPublicProfile()
    }
  };
  
  console.log('📥 Backend: Sending response:', response);
  res.json(response);
}));

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (admin only)
router.get('/', requireAdmin, [
  query('role')
    .optional()
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid role'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must not be empty')
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
    role,
    isActive,
    search,
    page = 1,
    limit = 10
  } = req.query;

  // Build filter object
  const filter = {};

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Search functionality
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { vtuId: { $regex: search, $options: 'i' } },
      { facultyId: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get users with pagination
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalUsers: total,
        hasNextPage: skip + users.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (admin or self)
router.get('/:id', requireOwnershipOrAdmin('id'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user by ID (admin only)
// @access  Private (admin only)
router.put('/:id', requireAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid role'),
  body('vtuId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('VTU ID must be between 1 and 50 characters'),
  body('facultyId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Faculty ID must be between 1 and 50 characters'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must be less than 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const {
    name,
    email,
    role,
    vtuId,
    facultyId,
    designation,
    department,
    isActive
  } = req.body;

  // Update fields
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (vtuId !== undefined) user.vtuId = vtuId;
  if (facultyId !== undefined) user.facultyId = facultyId;
  if (designation !== undefined) user.designation = designation;
  if (department !== undefined) user.department = department;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   GET /api/users/all
// @desc    Get all users for admin dashboard
// @access  Private (admin only)
router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: {
      users: users.map(user => user.getPublicProfile())
    }
  });
}));

// @route   PUT /api/users/:id/status
// @desc    Update user status (active/inactive)
// @access  Private (admin only)
router.put('/:id/status', requireAdmin, [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate your own account'
    });
  }

  user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (admin only)
router.put('/:id/role', requireAdmin, [
  body('role')
    .isIn(['student', 'faculty', 'admin'])
    .withMessage('Invalid role')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { role } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from changing their own role
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot change your own role'
    });
  }

  user.role = role;
  await user.save();

  res.json({
    success: true,
    message: 'User role updated successfully',
    data: {
      user: user.getPublicProfile()
    }
  });
}));

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  await User.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @route   GET /api/users/faculty/list
// @desc    Get list of faculty members (for document assignment)
// @access  Private
router.get('/faculty/list', asyncHandler(async (req, res) => {
  const faculty = await User.find({ 
    role: 'faculty', 
    isActive: true 
  })
  .select('name email facultyId designation department')
  .sort({ name: 1 });

  res.json({
    success: true,
    data: {
      faculty
    }
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private (admin only)
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
  // Get counts for different roles
  const studentCount = await User.countDocuments({ role: 'student', isActive: true });
  const facultyCount = await User.countDocuments({ role: 'faculty', isActive: true });
  const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
  const totalUsers = await User.countDocuments({ isActive: true });
  const inactiveUsers = await User.countDocuments({ isActive: false });

  // Get users with signatures
  const usersWithSignatures = await User.countDocuments({ 
    signature: { $exists: true, $ne: null },
    isActive: true 
  });

  // Get recent registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get department distribution
  const departmentStats = await User.aggregate([
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

  res.json({
    success: true,
    data: {
      counts: {
        total: totalUsers,
        students: studentCount,
        faculty: facultyCount,
        admins: adminCount,
        inactive: inactiveUsers,
        withSignatures: usersWithSignatures
      },
      recentRegistrations,
      departmentDistribution: departmentStats
    }
  });
}));

export default router;
