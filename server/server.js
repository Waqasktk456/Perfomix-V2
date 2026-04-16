const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const employeesRouter = require('./routes/employees');
const evaluationsRouter = require('./routes/evaluations');
const teamrouter = require('./routes/teamRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
// app.use('/api/employees', employeesRouter); // Duplicate route removed to correct conflict
app.use('/api/teams', teamrouter);
app.use('/api/evaluations', evaluationsRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
