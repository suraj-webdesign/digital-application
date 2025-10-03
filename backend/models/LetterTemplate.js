import mongoose from 'mongoose';

const letterTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['application', 'request', 'complaint', 'recommendation', 'certificate', 'other'],
    required: true
  },
  template: {
    type: String,
    required: [true, 'Template content is required']
  },
  fields: [{
    name: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'textarea', 'date', 'select'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    placeholder: String,
    options: [String] // For select type
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
letterTemplateSchema.index({ category: 1, isActive: 1 });

const LetterTemplate = mongoose.model('LetterTemplate', letterTemplateSchema);

export default LetterTemplate;
