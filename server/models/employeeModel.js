// server/models/employeeModel.js

const db = require('../config/db');  // Your mysql2/promise connection
const bcrypt = require('bcrypt');

// Helper to hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// CREATE: Insert a new employee
const createEmployee = async (employee) => {
  // Hash password if provided
  if (employee.user_password) {
    employee.user_password = await hashPassword(employee.user_password);
  }

  const fieldNames = [
    'organization_id', 'department_id', 'team_id', 'user_id', 'first_name',
    'last_name', 'email', 'user_password', 'employee_code',
    'designation', 'role', 'joining_date', 'employment_status', 'is_active'
  ];

  const params = fieldNames.map(field => {
    if (field === 'team_id' || field === 'user_id') {
      return employee[field] && employee[field] !== '' ? employee[field] : null;
    }
    if (field === 'department_id') {
      return employee[field] || null;
    }
    return (employee[field] !== undefined && employee[field] !== null) ? employee[field] : null;
  });

  const query = `INSERT INTO employees (
    organization_id, department_id, team_id, user_id, first_name, 
    last_name, email, user_password, employee_code, designation, role, 
    joining_date, employment_status, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const [results] = await db.execute(query, params);
  return results;
};

// READ: Get employee by ID (with joins)
const getEmployeeById = async (employeeId) => {
  const query = `
    SELECT 
      e.*,
      d.department_name,
      t.team_name,
      o.organization_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN teams t ON e.team_id = t.id
    LEFT JOIN organizations o ON e.organization_id = o.id
    WHERE e.id = ? AND e.deleted_at IS NULL
  `;
  const [results] = await db.execute(query, [employeeId]);
  return results;
};

// UPDATE: Update employee details
const updateEmployee = async (employeeId, employee, requesterId) => {
  // Hash password if provided
  if (employee.user_password) {
    employee.user_password = await hashPassword(employee.user_password);
  }

  const fieldNames = [
    'organization_id', 'department_id', 'team_id', 'user_id', 'first_name',
    'last_name', 'email', 'user_password', 'employee_code', 'designation', 'role',
    'joining_date', 'employment_status', 'is_active', 'profile_image',
    'marital_status', 'date_of_birth', 'primary_contact_number', 'permanent_address'
  ];

  const params = fieldNames.map(field => {
    if (field === 'team_id' || field === 'user_id') {
      return employee[field] && employee[field] !== '' ? employee[field] : null;
    }
    if (field === 'department_id') {
      return employee[field] || null;
    }
    return (employee[field] !== undefined && employee[field] !== null) ? employee[field] : null;
  });

  params.push(employeeId, requesterId, employee.organization_id);

  const query = `UPDATE employees SET 
    organization_id = ?, department_id = ?, team_id = ?, user_id = ?, 
    first_name = ?, last_name = ?, email = ?, user_password = ?, 
    employee_code = ?, designation = ?, role = ?, joining_date = ?, 
    employment_status = ?, is_active = ?, profile_image = ?,
    marital_status = ?, date_of_birth = ?, primary_contact_number = ?, permanent_address = ?
  WHERE id = ? AND (id = ? OR organization_id = ?) AND deleted_at IS NULL`;

  const [results] = await db.execute(query, params);
  return results;
};

// DELETE: Soft delete + rename email
const deleteEmployee = async (employeeId) => {
  // 1. Fetch current email
  const [rows] = await db.execute('SELECT id, email FROM employees WHERE id = ? LIMIT 1', [employeeId]);
  if (rows.length === 0) return { affectedRows: 0 };

  const oldEmail = rows[0].email;
  const archivedEmail = `${oldEmail}__deleted__${Date.now()}`;

  const query = `
    UPDATE employees 
    SET deleted_at = CURRENT_TIMESTAMP,
        email = ?
    WHERE id = ?
  `;

  const [results] = await db.execute(query, [archivedEmail, employeeId]);
  return results;
};

// GET BY ROLE
const getEmployeesByRole = async (role) => {
  const query = `
    SELECT 
      e.*,
      d.department_name,
      t.team_name,
      o.organization_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN teams t ON e.team_id = t.id
    LEFT JOIN organizations o ON e.organization_id = o.id
    WHERE e.role = ? AND e.deleted_at IS NULL
  `;
  const [results] = await db.execute(query, [role]);
  return results;
};

// GET BY DEPARTMENT
const getEmployeesByDepartment = async (departmentId) => {
  const query = `
    SELECT 
      e.*,
      d.department_name,
      t.team_name,
      o.organization_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN teams t ON e.team_id = t.id
    LEFT JOIN organizations o ON e.organization_id = o.id
    WHERE e.department_id = ? AND e.deleted_at IS NULL
  `;
  const [results] = await db.execute(query, [departmentId]);
  return results;
};

module.exports = {
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmployeesByRole,
  getEmployeesByDepartment
};
