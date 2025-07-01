const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Initialize Firebase Admin FIRST
const { admin } = require("./utils/firebaseAdmin");
const { connectToDatabase, checkConnection } = require("./utils/db");

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Initialize WebSocket service early but don't start it yet
const websocketService = require("./services/websocket.service");

// 🔧 Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(compression());

// 🔧 CORS with specific origins for production
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'https://aniflixx-backend.onrender.com',
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin) || origin === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many auth attempts, please try again later."
});

app.use('/api/', limiter);
app.use('/api/user/register', strictLimiter);
app.use('/api/user/login', strictLimiter);

// Request parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging in production
if (process.env.NODE_ENV === 'production') {
  const morgan = require('morgan');
  app.use(morgan('combined'));
}

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000);
  next();
});

// ✅ Initialize WebSocket service BEFORE routes
// This ensures global.websocketService is available for all controllers
async function initializeWebSocket() {
  try {
    await websocketService.initialize(server);
    global.websocketService = websocketService;
    console.log('🔌 WebSocket service initialized and set globally');
    console.log('✅ global.websocketService is now available');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
    return false;
  }
}

// Routes - These will now have access to global.websocketService
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/user", require("./routes/profile.routes"));
app.use("/api", require("./routes/upload.routes"));
app.use("/api/reels", require("./routes/reels.routes"));
app.use("/api/reels", require("./routes/viewers.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/social", require("./routes/social.routes"));
app.use("/api/comments", require("./routes/comments.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));

// Health Check
app.get("/", (req, res) => res.send("Server is running with WebSocket support"));

app.get("/api/health", async (req, res) => {
  try {
    const dbConnected = await checkConnection();
    const wsConnections = websocketService.getIO() ? websocketService.getIO().sockets.sockets.size : 0;
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: dbConnected ? "healthy" : "unhealthy",
      timestamp: new Date(),
      uptime: process.uptime(),
      websocket: {
        connected: wsConnections,
        engine: websocketService.getIO() ? websocketService.getIO().engine.clientsCount : 0,
        globalAvailable: !!global.websocketService
      },
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
      },
      database: dbConnected ? "connected" : "disconnected",
      environment: process.env.NODE_ENV || 'development',
      firebase: admin.apps.length > 0 ? "initialized" : "not initialized",
      analytics: "DISABLED"
    });
  } catch (error) {
    res.status(503).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// WebSocket Status Endpoint
app.get("/api/ws/status", (req, res) => {
  const io = websocketService.getIO();
  const connectedSockets = io ? io.sockets.sockets.size : 0;
  res.json({
    status: io ? "active" : "not initialized",
    connections: connectedSockets,
    transport: ['websocket', 'polling'],
    rooms: io ? io.sockets.adapter.rooms.size : 0,
    globalAvailable: !!global.websocketService
  });
});

// Test WebSocket endpoint
app.get("/test-websocket", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Socket.IO Test</title>
    </head>
    <body>
      <h1>Socket.IO Test Page</h1>
      <div id="status">Connecting...</div>
      <div id="messages"></div>
      
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const status = document.getElementById('status');
        const messages = document.getElementById('messages');
        
        function log(message) {
          console.log(message);
          const p = document.createElement('p');
          p.textContent = new Date().toISOString() + ' - ' + message;
          messages.appendChild(p);
        }
        
        socket.on('connect', () => {
          status.textContent = 'Connected! Socket ID: ' + socket.id;
          log('Connected to server');
        });
        
        socket.on('connect_error', (error) => {
          status.textContent = 'Connection Error: ' + error.message;
          log('Connection error: ' + error.message);
        });
        
        socket.on('disconnect', (reason) => {
          status.textContent = 'Disconnected: ' + reason;
          log('Disconnected: ' + reason);
        });
        
        socket.on('notification:new', (data) => {
          log('Notification received: ' + JSON.stringify(data));
        });
      </script>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error",
    ...(isDevelopment && { stack: err.stack })
  });
});

// Connect to DB and Start Server with Socket.IO
connectToDatabase()
  .then(async () => {
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔥 Firebase Admin initialized: ${admin.apps.length > 0}`);
      
      // Initialize WebSocket after server is listening
      const wsInitialized = await initializeWebSocket();
      
      if (!wsInitialized) {
        console.error('⚠️ Server running without WebSocket support');
      }
      
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'Not set'}`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log('🔒 Production mode: Security features enabled');
      }
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB, server not started.", err);
    process.exit(1);
  });

// Graceful Shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  const io = websocketService.getIO();
  if (io) {
    io.close(() => {
      console.log('✅ WebSocket server closed');
    });
  }
  
  if (websocketService.shutdown) {
    websocketService.shutdown();
  }
  
  const { closeConnection } = require("./utils/db");
  await closeConnection();
  
  console.log('✅ Database connection closed');
  process.exit(0);
  
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

module.exports = { app, server };