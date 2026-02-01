// server/controllers/employeeController.js

const employeeModel = require('../models/employeeModel');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saas_perfomix'
});

// CREATE: Create a new employee
const createProfile = async (req, res) => {
  try {
    const employee = req.body;

    // Enforce organizationId from token
    const organizationId = req.user.organizationId;
    if (!organizationId) return res.status(400).json({ error: 'Organization ID missing in token' });
    employee.organization_id = organizationId;

    if (!employee.role || !employee.email) {
      return res.status(400).json({ error: 'Role and Email are required' });
    }

    if (!employee.user_password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const results = await employeeModel.createEmployee(employee);

    return res.status(201).json({
      message: 'Employee created successfully',
      data: { ...employee, id: results.insertId }
    });
  } catch (err) {
    console.error('Error creating employee:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email or employee code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create employee', details: err.message });
  }
};

// READ: Get all employees (filtered by organization and optionally by department)
const getAllProfiles = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { department_id } = req.query; // Get department_id from query params

    let query = `SELECT 
          e.*,
          d.department_name,
          t.team_name,
          o.organization_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN team_members tm ON e.id = tm.employee_id
       LEFT JOIN teams t ON tm.team_id = t.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.organization_id = ? AND e.deleted_at IS NULL`;

    const params = [organizationId];

    // Add department filter if provided
    if (department_id) {
      query += ` AND e.department_id = ?`;
      params.push(department_id);
    }

    query += ` ORDER BY e.id DESC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json(rows); // Return array directly for frontend compatibility
  } catch (err) {
    console.error('Error fetching all profiles:', err);
    return res.status(500).json({ error: 'Failed to retrieve profiles', details: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const employeeId = req.params.id || req.params.Employee_id;
    const organizationId = req.user.organizationId;
    const requesterId = req.user.id;

    const [results] = await pool.query(
      `SELECT 
          e.*,
          d.department_name,
          t.team_name,
          o.organization_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN teams t ON e.team_id = t.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.id = ? AND e.deleted_at IS NULL
       AND (e.id = ? OR e.organization_id = ?)`,
      [employeeId, requesterId, organizationId]
    );

    if (results.length === 0) {
      console.log('Employee not found or unauthorized access');
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.status(200).json({ data: results[0] });
  } catch (err) {
    console.error('Error fetching employee:', err);
    return res.status(500).json({ error: 'Failed to retrieve employee' });
  }
};

// UPDATE: Update employee
const updateProfile = async (req, res) => {
  try {
    const employeeId = req.params.id || req.params.Employee_id;
    const employee = req.body;
    const organizationId = req.user.organizationId;

    employee.organization_id = organizationId;

    // Map field names if they are capitalized from the frontend
    if (employee.First_name) employee.first_name = employee.First_name;
    if (employee.Last_name) employee.last_name = employee.Last_name;
    if (employee.Email) employee.email = employee.Email;
    if (employee.Role) employee.role = employee.Role;
    if (employee.Designation) employee.designation = employee.Designation;
    if (employee.Joining_date) employee.joining_date = employee.Joining_date;
    if (employee.Date_of_birth) employee.date_of_birth = employee.Date_of_birth;
    if (employee.Marital_status) employee.marital_status = employee.Marital_status;
    if (employee.Primary_contact_number) employee.primary_contact_number = employee.Primary_contact_number;
    if (employee.Permanent_address) employee.permanent_address = employee.Permanent_address;
    if (employee.Employment_status) employee.employment_status = employee.Employment_status;
    if (employee.Is_active !== undefined) employee.is_active = employee.Is_active;

    if (!employee.role || !employee.email) {
      console.log('Missing role or email:', { role: employee.role, email: employee.email });
      return res.status(400).json({ error: 'Role and Email are required' });
    }

    // If password is empty, remove it from update to avoid overwriting
    if (!employee.user_password) delete employee.user_password;

    // If picture is uploaded via multer
    if (req.file) {
      employee.profile_image = `/uploads/${req.file.filename}`;
    } else if (employee.Profile_image) {
      employee.profile_image = employee.Profile_image;
    }

    const requesterId = req.user.id;

    // Use the existing model
    const results = await employeeModel.updateEmployee(employeeId, employee, requesterId);

    if (results.affectedRows === 0) {
      console.log('No rows affected for employeeId:', employeeId);
      return res.status(404).json({ error: 'Employee not found or no changes made' });
    }

    return res.status(200).json({
      message: 'Employee updated successfully',
      data: { ...employee, id: employeeId }
    });
  } catch (err) {
    console.error('Error updating employee:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email or employee code already exists' });
    return res.status(500).json({ error: 'Failed to update employee', details: err.message });
  }
};

// DELETE: Soft delete + rename email
const deleteProfile = async (req, res) => {
  try {
    const employeeId = req.params.id || req.params.Employee_id;

    const results = await employeeModel.deleteEmployee(employeeId);
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });

    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// GET employees by role
const getProfilesByRole = async (req, res) => {
  try {
    const role = req.params.role;
    const organizationId = req.user.organizationId;

    const [results] = await pool.query(
      `SELECT 
          e.*,
          d.department_name,
          t.team_name,
          o.organization_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN teams t ON e.team_id = t.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.role = ? AND e.organization_id = ? AND e.deleted_at IS NULL`,
      [role, organizationId]
    );

    return res.status(200).json({ data: results });
  } catch (err) {
    console.error('Error fetching employees by role:', err);
    return res.status(500).json({ error: 'Failed to retrieve employees by role' });
  }
};

// GET employees by department (alternative endpoint if needed)
const getProfilesByDepartment = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    const organizationId = req.user.organizationId;

    const [results] = await pool.query(
      `SELECT 
          e.*,
          d.department_name,
          t.team_name,
          o.organization_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN teams t ON e.team_id = t.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.department_id = ? AND e.organization_id = ? AND e.deleted_at IS NULL`,
      [departmentId, organizationId]
    );

    return res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching employees by department:', err);
    return res.status(500).json({ error: 'Failed to retrieve employees by department' });
  }
};

module.exports = {
  createProfile,
  getAllProfiles,
  getProfile,
  updateProfile,
  deleteProfile,
  getProfilesByRole,
  getProfilesByDepartment
};