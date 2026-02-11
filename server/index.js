require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

// Route imports
const authRoutes = require('./routes/authRoutes');
const parameterRoutes = require('./routes/parameters');     // ← CLEAN parameters
const matrixRoutes = require('./routes/matrixRoutes');           // ← CLEAN matrices
const organizationRoutes = require('./routes/organizationRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const employeesRouter = require('./routes/employees');
const evaluationsRouter = require('./routes/evaluations');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const linemanager = require('./routes/lineManagerRoutes');
const templateRoutes = require('./routes/templateRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ADD THIS LINE - EVALUATION CYCLE ROUTES
const evaluationCycleRoutes = require('./routes/evaluationCycleRoutes');

// Import cron jobs
const scheduleDeadlineReminders = require('./services/cronJobs');

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Database connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_perfomix'
};

const pool = mysql.createPool(dbConfig);

// Test DB connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// === ROUTE MOUNTING (SPECIFIC FIRST) ===
console.log('\n=== MOUNTING ROUTES ===');

app.use('/api/auth', authRoutes);
console.log('Mounted: /api/auth → authRoutes');

app.use('/api/parameters', parameterRoutes);
console.log('Mounted: /api/parameters → parameterRoutes (CLEAN)');

app.use('/api/matrices', matrixRoutes);
console.log('Mounted: /api/matrices → matrixRoutes (CLEAN)');

app.use('/api/organizations', organizationRoutes);
console.log('Mounted: /api/organizations → organizationRoutes');

app.use('/api/departments', departmentRoutes);
console.log('Mounted: /api/departments → departmentRoutes');

app.use('/api/employees', employeeRoutes);
console.log('Mounted: /api/employees → employeeRoutes');

app.use('/api/employees-data', employeesRouter);
console.log('Mounted: /api/employees-data → employeesRouter');

app.use('/api/teams', teamRoutes);
console.log('Mounted: /api/teams → teamRoutes');

app.use('/api/users', userRoutes);
console.log('Mounted: /api/users → userRoutes');

app.use('/api/templates', templateRoutes);
console.log('Mounted: /api/templates → templateRoutes');

app.use('/api/evaluations', evaluationsRouter);
console.log('Mounted: /api/evaluations → evaluationsRouter');
app.use('/api/line-manager', linemanager);
console.log('Mounted: /api/line-manager → linemanager');
app.use('/api/staff', require('./routes/staffRoutes'));
console.log('Mounted: /api/staff → staffRoutes');
app.use('/api/reports', reportRoutes);
console.log('Mounted: /api/reports → reportRoutes');

app.use('/api/notifications', notificationRoutes);
console.log('Mounted: /api/notifications → notificationRoutes');

// ADD THIS LINE - MOUNT EVALUATION CYCLE ROUTES
app.use('/api', evaluationCycleRoutes);
console.log('Mounted: /api/cycles, /api/cycle-assignments → evaluationCycleRoutes');

console.log('=== ALL ROUTES MOUNTED SUCCESSFULLY ===\n');

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Perfomix API is working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'Perfomix Backend',
    importantEndpoints: {
      parameters: 'GET/POST /api/parameters',
      matrices: 'GET/POST /api/matrices',
      organizations: 'GET/POST /api/organizations',
      cycles: 'GET/POST /api/cycles',
      test: 'GET /api/test'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('=== UNHANDLED ERROR ===', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requested: `${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(port, () => {
  console.log(`\nPerfomix Backend running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nKey Endpoints:');
  console.log('   GET    /api/test');
  console.log('   GET    /api/health');
  console.log('   GET    /api/parameters');
  console.log('   POST   /api/parameters');
  console.log('   GET    /api/matrices');
  console.log('   POST   /api/matrices');
  console.log('   DELETE /api/matrices/:id');
  console.log('   GET    /api/cycles');
  console.log('   POST   /api/cycles');
  console.log('   GET    /api/organizations\n');

  // Initialize cron jobs
  scheduleDeadlineReminders();
  console.log('✓ Cron jobs initialized\n');
});