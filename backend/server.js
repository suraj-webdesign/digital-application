import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import approvalRoutes from './routes/approvals.js';
import signatureRoutes from './routes/signatures.js';
import analyticsRoutes from './routes/analytics.js';
import letterRoutes from './routes/letters.js';

// Import models
import LetterTemplate from './models/LetterTemplate.js';
import User from './models/User.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import WebSocket service
import webSocketService from './services/websocketService.js';

// Load environment variables
dotenv.config();

// Set default environment variables if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production-12345';
  console.log('⚠️  Using default JWT_SECRET. Please set JWT_SECRET in .env file for production.');
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/document-approval-system';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:3003',
    'http://localhost:5173',  // Vite default port
    'http://localhost:5174',  // Vite alternative port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Digital Document Approval System API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/documents', authenticateToken, documentRoutes);
app.use('/api/approvals', authenticateToken, approvalRoutes);
app.use('/api/signatures', authenticateToken, signatureRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
// Public letter templates route (no auth required) - must come before protected routes
app.get('/api/letters/templates', async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const templates = await LetterTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        templates,
        count: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch letter templates'
    });
  }
});

app.get('/api/letters/templates/:id', async (req, res) => {
  try {
    const template = await LetterTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        template
      }
    });
  } catch (error) {
    console.error('Error fetching letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch letter template'
    });
  }
});

// Protected letter routes (auth required)
app.use('/api/letters', authenticateToken, letterRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/document-approval-system');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize WebSocket service
    webSocketService.initialize(server);
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket service initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
