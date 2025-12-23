const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server for both Express and Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins in development (you can restrict in production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'], // Support both transports
  allowEIO3: true // Support older clients
});

// Export io and prisma IMMEDIATELY so routes can import them
// This must happen BEFORE requiring the routes
module.exports = { prisma, io };

// Make io accessible to routes
app.set('io', io);

// Serve static files from public directory
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bharat CRM API is running' });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const contactRoutes = require('./routes/contacts');
const invoiceRoutes = require('./routes/invoices');
const dealRoutes = require('./routes/deals');
const pipelineStagesRoutes = require('./routes/pipelineStages');
const taskRoutes = require('./routes/tasks');
const whatsappRoutes = require('./routes/whatsapp');
const calendarRoutes = require('./routes/calendar');
const searchRoutes = require('./routes/search');
const teamsRoutes = require('./routes/teams');
const emailRoutes = require('./routes/emails');
const aiRoutes = require('./routes/ai');
const salesForecastRoutes = require('./routes/salesForecast');
const automationRoutes = require('./routes/automation');
const documentsRoutes = require('./routes/documents');
const vectorDataRoutes = require('./routes/vectorData');
const migrateRoutes = require('./routes/migrate');
const campaignsRoutes = require('./routes/campaigns');
const formsRoutes = require('./routes/forms');
const landingPagesRoutes = require('./routes/landingPages');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/pipeline-stages', pipelineStagesRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/forecast', salesForecastRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/vector-data', vectorDataRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/landing-pages', landingPagesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Log when Socket.IO server is ready
console.log('🔌 Socket.IO server initialized');
console.log('   - CORS origin:', 'All origins allowed (development mode)');
console.log('   - Transports:', 'websocket, polling');

// Socket.IO authentication middleware
io.use((socket, next) => {
  console.log('🔌 New WebSocket connection attempt from:', socket.handshake.address);
  console.log('   - Transport:', socket.conn.transport.name);

  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.error('❌ WebSocket: No token provided in handshake');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;

    console.log(`✅ WebSocket: User ${decoded.email} authenticated successfully`);
    next();
  } catch (error) {
    console.error('❌ WebSocket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`✅ WebSocket: User ${socket.userEmail} connected (ID: ${socket.id})`);
  console.log(`   - Transport: ${socket.conn.transport.name}`);
  console.log(`   - User room: user:${userId}`);

  // Join user-specific room for targeted messages
  socket.join(`user:${userId}`);

  socket.on('disconnect', (reason) => {
    console.log(`❌ WebSocket: User ${socket.userEmail} disconnected`);
    console.log(`   - Reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`⚠️ WebSocket error for user ${socket.userEmail}:`, error);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  io.close(() => {
    console.log('✅ WebSocket server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize campaign scheduler
const campaignScheduler = require('./services/campaignScheduler');
campaignScheduler.initialize(io);
campaignScheduler.start();

// Start server (HTTP + WebSocket on same port)
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
});
