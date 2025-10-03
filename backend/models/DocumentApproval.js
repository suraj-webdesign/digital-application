import mongoose from 'mongoose';

const documentApprovalSchema = new mongoose.Schema({
  document_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Letter',
    required: true,
    index: true
  },
  approver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['approved', 'rejected', 'signed'],
    required: true,
    index: true
  },
  signed_pdf_url: {
    type: String,
    default: null
  },
  comment: {
    type: String,
    maxlength: 500,
    default: null
  },
  rejection_reason: {
    type: String,
    maxlength: 500,
    default: null
  },
  // Additional metadata
  approver_name: {
    type: String,
    required: true
  },
  approver_role: {
    type: String,
    required: true
  },
  approver_designation: {
    type: String,
    default: null
  },
  document_title: {
    type: String,
    required: true
  },
  student_name: {
    type: String,
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // File information
  file_name: {
    type: String,
    default: null
  },
  file_size: {
    type: Number,
    default: 0
  },
  mime_type: {
    type: String,
    default: 'application/pdf'
  },
  // Workflow information
  workflow_step: {
    type: String,
    enum: ['mentor', 'hod', 'dean', 'completed', 'rejected'],
    required: true
  },
  is_final_approval: {
    type: Boolean,
    default: false
  },
  // Timestamps
  approved_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  signed_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
documentApprovalSchema.index({ document_id: 1, approver_id: 1 });
documentApprovalSchema.index({ approver_id: 1, status: 1 });
documentApprovalSchema.index({ document_id: 1, status: 1 });
documentApprovalSchema.index({ approved_at: -1 });

// Static method to create approval record
documentApprovalSchema.statics.createApprovalRecord = async function(approvalData) {
  try {
    const approvalRecord = new this({
      document_id: approvalData.document_id,
      approver_id: approvalData.approver_id,
      status: approvalData.status,
      signed_pdf_url: approvalData.signed_pdf_url || null,
      comment: approvalData.comment || null,
      rejection_reason: approvalData.rejection_reason || null,
      approver_name: approvalData.approver_name,
      approver_role: approvalData.approver_role,
      approver_designation: approvalData.approver_designation,
      document_title: approvalData.document_title,
      student_name: approvalData.student_name,
      student_id: approvalData.student_id,
      file_name: approvalData.file_name || null,
      file_size: approvalData.file_size || 0,
      mime_type: approvalData.mime_type || 'application/pdf',
      workflow_step: approvalData.workflow_step,
      is_final_approval: approvalData.is_final_approval || false,
      approved_at: approvalData.approved_at || new Date(),
      signed_at: approvalData.signed_at || null
    });

    await approvalRecord.save();
    return approvalRecord;
  } catch (error) {
    console.error('Error creating approval record:', error);
    throw error;
  }
};

// Static method to get faculty approval history
documentApprovalSchema.statics.getFacultyApprovalHistory = async function(facultyId, options = {}) {
  try {
    const {
      status = null,
      limit = 50,
      skip = 0,
      sortBy = 'approved_at',
      sortOrder = 'desc'
    } = options;

    const query = { approver_id: facultyId };
    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const approvals = await this.find(query)
      .populate('document_id', 'title status submittedAt')
      .populate('student_id', 'name email')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip);

    const totalCount = await this.countDocuments(query);

    return {
      approvals,
      totalCount,
      hasMore: (skip + approvals.length) < totalCount
    };
  } catch (error) {
    console.error('Error getting faculty approval history:', error);
    throw error;
  }
};

// Static method to get document approval history
documentApprovalSchema.statics.getDocumentApprovalHistory = async function(documentId) {
  try {
    const approvals = await this.find({ document_id: documentId })
      .populate('approver_id', 'name email designation')
      .sort({ approved_at: 1 });

    return approvals;
  } catch (error) {
    console.error('Error getting document approval history:', error);
    throw error;
  }
};

// Instance method to get download URL
documentApprovalSchema.methods.getDownloadUrl = function() {
  if (this.signed_pdf_url) {
    return this.signed_pdf_url;
  }
  return null;
};

// Instance method to check if signed
documentApprovalSchema.methods.isSigned = function() {
  return this.status === 'signed' && this.signed_pdf_url;
};

const DocumentApproval = mongoose.model('DocumentApproval', documentApprovalSchema);

export default DocumentApproval;
