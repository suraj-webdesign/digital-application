import mongoose from 'mongoose';

const letterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Letter title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  templateId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for hardcoded templates
    ref: 'LetterTemplate',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Letter content is required']
  },
  fields: {
    type: Map,
    of: String
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'signed'],
    default: 'draft'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Workflow assignments (same as Document)
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
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  // E-signature fields
  signatures: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    signature: {
      type: String, // Base64 encoded signature
      required: false,
      default: null
    },
    signedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Proof file attachment
  proofFile: {
    fileName: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    filePath: {
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
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  // Clean document information (PDF without signatures)
  cleanDocument: {
    fileName: {
      type: String,
      trim: true
    },
    filePath: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    generatedAt: {
      type: Date,
      default: null
    }
  },
  // Signed document information
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
  // Reminder tracking
  reminderCount: {
    type: Number,
    default: 0
  },
  lastReminderSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
letterSchema.index({ submittedBy: 1, status: 1 });
letterSchema.index({ currentApprover: 1, status: 1 });

// Instance method to approve letter
letterSchema.methods.approve = function(approverId) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to reject letter
letterSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  return this.save();
};

// Instance method to add signature
letterSchema.methods.addSignature = function(approverId, signature, ipAddress, userAgent) {
  this.signatures.push({
    approver: approverId,
    signature,
    signedAt: new Date(),
    ipAddress,
    userAgent
  });
  return this.save();
};

const Letter = mongoose.model('Letter', letterSchema);

export default Letter;
