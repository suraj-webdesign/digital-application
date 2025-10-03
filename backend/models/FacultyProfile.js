import mongoose from 'mongoose';

const facultyProfileSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  signatureUrl: {
    type: String,
    default: null,
    trim: true
  },
  signatureUploadedAt: {
    type: Date,
    default: null
  },
  signatureRemovedAt: {
    type: Date,
    default: null
  },
  isSignatureActive: {
    type: Boolean,
    default: false
  },
  // Additional profile fields can be added here
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  officeLocation: {
    type: String,
    trim: true,
    maxlength: [200, 'Office location cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Index for better query performance
// facultyId already has unique index from schema definition
facultyProfileSchema.index({ isSignatureActive: 1 });

// Virtual to check if signature is available
facultyProfileSchema.virtual('hasSignature').get(function() {
  return this.isSignatureActive && this.signatureUrl && !this.signatureRemovedAt;
});

// Method to update signature
facultyProfileSchema.methods.updateSignature = function(signatureUrl) {
  this.signatureUrl = signatureUrl;
  this.signatureUploadedAt = new Date();
  this.signatureRemovedAt = null;
  this.isSignatureActive = true;
  return this.save();
};

// Method to remove signature
facultyProfileSchema.methods.removeSignature = function() {
  this.signatureRemovedAt = new Date();
  this.isSignatureActive = false;
  return this.save();
};

// Static method to get or create profile
facultyProfileSchema.statics.getOrCreateProfile = async function(facultyId) {
  let profile = await this.findOne({ facultyId });
  if (!profile) {
    profile = new this({ facultyId });
    await profile.save();
  }
  return profile;
};

const FacultyProfile = mongoose.model('FacultyProfile', facultyProfileSchema);

export default FacultyProfile;
