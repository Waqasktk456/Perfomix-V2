const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_perfomix'
};

// Create database connection pool
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log('Database connection pool created successfully');
} catch (error) {
  console.error('Failed to create database connection pool:', error);
  process.exit(1);
}

// Export the pool
module.exports = pool; 