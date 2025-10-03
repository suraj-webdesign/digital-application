import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  documentType: {
    type: String,
    enum: ['assignment', 'project', 'certificate', 'transcript', 'other'],
    default: 'other',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'archived'],
    default: 'pending',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitter is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assignee is required']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Workflow assignments
  assignedMentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedHOD: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedDean: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  workflowStep: {
    type: String,
    enum: ['mentor', 'hod', 'dean', 'completed'],
    default: 'mentor'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  rejectionDate: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Signed document fields
  signedDocument: {
    fileName: {
      type: String,
      trim: true
    },
    filePath: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String,
      trim: true
    },
    signedAt: {
      type: Date,
      default: null
    },
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    signatureData: {
      facultyName: {
        type: String,
        trim: true
      },
      facultyDesignation: {
        type: String,
        trim: true
      },
      signature: {
        type: String // Base64 encoded signature
      }
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date,
    default: null
  },
  metadata: {
    checksum: String, // File integrity check
    version: {
      type: String,
      default: '1.0'
    },
    language: {
      type: String,
      default: 'en'
    },
    subject: String,
    semester: String,
    academicYear: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for document age
documentSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for isOverdue
documentSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Virtual for processingTime
documentSchema.virtual('processingTime').get(function() {
  if (this.status === 'pending') return null;
  if (this.approvedAt) {
    return this.approvedAt.getTime() - this.submittedAt.getTime();
  }
  if (this.rejectionDate) {
    return this.rejectionDate.getTime() - this.submittedAt.getTime();
  }
  return null;
});

// Indexes for better query performance
documentSchema.index({ status: 1, submittedAt: -1 });
documentSchema.index({ submittedBy: 1, status: 1 });
documentSchema.index({ assignedTo: 1, status: 1 });
documentSchema.index({ documentType: 1, status: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware to update timestamps
documentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
    if (this.status === 'rejected' && !this.rejectionDate) {
      this.rejectionDate = new Date();
    }
  }
  next();
});

// Static method to find documents by status
documentSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('submittedBy', 'name email role');
};

// Static method to find documents by user
documentSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { submittedBy: userId },
      { assignedTo: userId }
    ]
  }).populate('submittedBy', 'name email role')
    .populate('assignedTo', 'name email role');
};

// Static method to find pending documents
documentSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('submittedBy', 'name email role')
    .populate('assignedTo', 'name email role');
};

// Instance method to add comment
documentSchema.methods.addComment = function(userId, comment) {
  this.comments.push({
    user: userId,
    comment: comment
  });
  return this.save();
};

// Instance method to approve document
documentSchema.methods.approve = function(approverId) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to reject document
documentSchema.methods.reject = function(rejectorId, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectorId;
  this.rejectionDate = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Instance method to increment download count
documentSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

const Document = mongoose.model('Document', documentSchema);

export default Document;
