import { Server } from 'socket.io';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map to store user connections
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user authentication and room joining
      socket.on('authenticate', (data) => {
        const { userId, userRole } = data;
        
        if (userId) {
          // Store user connection
          this.connectedUsers.set(socket.id, { userId, userRole, socket });
          
          // Join user-specific room
          socket.join(`user_${userId}`);
          
          // Join role-specific room
          socket.join(`role_${userRole}`);
          
          // Join general room for system-wide updates
          socket.join('system_updates');
          
          console.log(`✅ User ${userId} (${userRole}) authenticated and joined rooms`);
          
          // Send confirmation
          socket.emit('authenticated', {
            success: true,
            message: 'Successfully authenticated with WebSocket service',
            userId,
            userRole
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          console.log(`🔌 User ${userInfo.userId} disconnected`);
          this.connectedUsers.delete(socket.id);
        } else {
          console.log(`🔌 Anonymous user ${socket.id} disconnected`);
        }
      });

      // Handle custom events
      socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`🔌 User ${socket.id} joined room: ${roomName}`);
      });

      socket.on('leave_room', (roomName) => {
        socket.leave(roomName);
        console.log(`🔌 User ${socket.id} left room: ${roomName}`);
      });
    });
  }

  // Broadcast approval update to relevant users
  broadcastApprovalUpdate(approvalData) {
    if (!this.io) {
      console.log('⚠️ WebSocket service not initialized');
      return;
    }

    const { letterId, studentId, facultyId, status, approverName, approverRole } = approvalData;

    // Create the update event data
    const updateEvent = {
      type: 'approval_updated',
      letterId,
      studentId,
      facultyId,
      status,
      approverName,
      approverRole,
      timestamp: new Date().toISOString(),
      message: `Letter ${letterId} has been ${status} by ${approverName}`
    };

    // Broadcast to specific users
    if (studentId) {
      this.io.to(`user_${studentId}`).emit('approval_updated', updateEvent);
      console.log(`📡 Broadcasted approval update to student ${studentId}`);
    }

    // Broadcast to faculty members
    this.io.to('role_faculty').emit('approval_updated', updateEvent);
    console.log(`📡 Broadcasted approval update to all faculty`);

    // Broadcast to admin
    this.io.to('role_admin').emit('approval_updated', updateEvent);
    console.log(`📡 Broadcasted approval update to admin`);

    // Broadcast to system-wide updates
    this.io.to('system_updates').emit('approval_updated', updateEvent);
    console.log(`📡 Broadcasted approval update to system updates room`);
  }

  // Broadcast document status update
  broadcastDocumentUpdate(documentData) {
    if (!this.io) {
      console.log('⚠️ WebSocket service not initialized');
      return;
    }

    const { documentId, studentId, status, message } = documentData;

    const updateEvent = {
      type: 'document_updated',
      documentId,
      studentId,
      status,
      message,
      timestamp: new Date().toISOString()
    };

    // Broadcast to relevant users
    if (studentId) {
      this.io.to(`user_${studentId}`).emit('document_updated', updateEvent);
    }

    this.io.to('role_faculty').emit('document_updated', updateEvent);
    this.io.to('role_admin').emit('document_updated', updateEvent);
    this.io.to('system_updates').emit('document_updated', updateEvent);

    console.log(`📡 Broadcasted document update: ${documentId} - ${status}`);
  }

  // Broadcast user activity
  broadcastUserActivity(activityData) {
    if (!this.io) {
      console.log('⚠️ WebSocket service not initialized');
      return;
    }

    const { userId, activity, details } = activityData;

    const activityEvent = {
      type: 'user_activity',
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin and system
    this.io.to('role_admin').emit('user_activity', activityEvent);
    this.io.to('system_updates').emit('user_activity', activityEvent);

    console.log(`📡 Broadcasted user activity: ${userId} - ${activity}`);
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    if (!this.io) {
      console.log('⚠️ WebSocket service not initialized');
      return;
    }

    const notificationEvent = {
      type: 'notification',
      ...notification,
      timestamp: new Date().toISOString()
    };

    this.io.to(`user_${userId}`).emit('notification', notificationEvent);
    console.log(`📡 Sent notification to user ${userId}: ${notification.title}`);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole(role) {
    const users = [];
    this.connectedUsers.forEach((userInfo, socketId) => {
      if (userInfo.userRole === role) {
        users.push({
          socketId,
          userId: userInfo.userId,
          userRole: userInfo.userRole
        });
      }
    });
    return users;
  }

  // Broadcast system message
  broadcastSystemMessage(message, target = 'all') {
    if (!this.io) {
      console.log('⚠️ WebSocket service not initialized');
      return;
    }

    const systemEvent = {
      type: 'system_message',
      message,
      timestamp: new Date().toISOString()
    };

    if (target === 'all') {
      this.io.emit('system_message', systemEvent);
    } else {
      this.io.to(`role_${target}`).emit('system_message', systemEvent);
    }

    console.log(`📡 Broadcasted system message to ${target}: ${message}`);
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
