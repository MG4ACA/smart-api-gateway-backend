const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import all route handlers (local services)
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const favoriteRoutes = require('./routes/favorites');

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      'http://localhost:3000', // Frontend development
      'http://localhost:3001', // Alternative frontend port
      process.env.FRONTEND_URL, // Production frontend URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Smart Recipe API Gateway (Unified)',
    version: '1.0.0',
    mode: 'Unified Gateway',
    endpoints: {
      auth: '/api/auth/*',
      recipes: '/api/recipes/*',
      favorites: '/api/favorites/*',
    },
  });
});

// API Routes with /api prefix for frontend compatibility
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/favorites', favoriteRoutes);

// User routes (basic user operations)
app.get('/api/users/profile', require('./middlewares/auth').authenticateToken, (req, res) => {
  res.json({
    userId: req.user.userId,
    email: req.user.email,
    message: 'User profile retrieved successfully',
  });
});

// Dashboard aggregation endpoint
app.get('/api/dashboard', require('./middlewares/auth').authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get user's favorites count
    const favoritesCount = await prisma.favorite.count({
      where: { userId: req.user.userId },
    });

    // Get recent favorites
    const recentFavorites = await prisma.favorite.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        recipeId: true,
        title: true,
        createdAt: true,
      },
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          email: req.user.email,
        },
        favorites: {
          count: favoritesCount,
          recent: recentFavorites,
        },
        message: 'Dashboard data retrieved successfully',
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/recipes/search',
      'GET /api/recipes/:id',
      'GET /api/favorites',
      'POST /api/favorites',
      'DELETE /api/favorites/:id',
      'GET /api/dashboard',
    ],
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Recipe Gateway running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔄 Mode: Unified Gateway (All services integrated)`);
});

module.exports = app;
