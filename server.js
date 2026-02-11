/**
 * Passive Learning Tracker - API Server
 * Express.js を使用したバックエンドサーバー
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// Middleware Configuration
// ===========================

// Security headers
const helmetConfig = {
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// 本番環境ではHTTPSを強制
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HTTPS_ONLY === 'true') {
  helmetConfig.contentSecurityPolicy = {
    directives: {
      defaultSrc: ["'self'"],
      upgradeInsecureRequests: []
    }
  };
}

app.use(helmet(helmetConfig));

// CORS設定 - Chrome拡張機能と許可されたオリジンからのアクセスを許可
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

console.log('🔒 Allowed Origins:', allowedOrigins);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

app.use(cors({
  origin: function(origin, callback) {
    // Chrome拡張機能の場合（originがnullまたはchrome-extension://で始まる）
    if (!origin || origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // 許可されたオリジンリストをチェック
    const isAllowed = allowedOrigins.some(allowed => {
      // 完全一致
      if (allowed === origin) return true;
      
      // ワイルドカード対応（例: https://*.yourdomain.com）
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(logFormat));
}

// Static files (Dashboard用)
app.use(express.static(path.join(__dirname, 'public')));

// ===========================
// Health Check Endpoint
// ===========================

app.get('/health', async (req, res) => {
  try {
    const isDbConnected = await db.testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ===========================
// API Routes
// ===========================

// ルートエンドポイント
app.get('/api', (req, res) => {
  res.json({
    message: 'Passive Learning Tracker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      track: 'POST /api/track',
      logs: 'GET /api/logs',
      stats: 'GET /api/stats',
      dashboard: '/'
    }
  });
});

// API routes
app.use('/api', apiRoutes);

// 学習ログ取得エンドポイント（Dashboard用 - 互換性のため残す）
app.get('/api/logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await db.query(
      `SELECT * FROM learning_logs 
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch learning logs',
      message: error.message
    });
  }
});

// ===========================
// Error Handling
// ===========================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===========================
// Server Startup
// ===========================

async function startServer() {
  try {
    // データベース接続テスト
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.warn('⚠️  Warning: Database connection failed, but server will start anyway');
    }
    
    // サーバー起動
    app.listen(PORT, '0.0.0.0', () => {
      console.log('=================================');
      console.log('🚀 Passive Learning Tracker API');
      console.log('=================================');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server gracefully...');
  await db.closePool();
  process.exit(0);
});

// サーバー起動
if (require.main === module) {
  startServer();
}

module.exports = app;
