const db = require('../config/db');

// Create a new department
exports.createDepartment = async (data) => {
  const query = `
    INSERT INTO departments (
      organization_id, department_code, department_name, department_type, 
      department_email, hod, department_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.organization_id,
    data.department_code,
    data.department_name,
    data.department_type,
    data.department_email,
    data.hod || '',
    data.department_description || ''
  ];
  const [result] = await db.query(query, values);
  return result;
};

// Get all departments (super admin - sees all)
exports.getAllDepartments = async () => {
  const query = `
    SELECT d.*, o.organization_name,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.deleted_at IS NULL) as number_of_employees
    FROM departments d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.is_active = 1
    ORDER BY d.created_at DESC
  `;
  const [rows] = await db.query(query);
  return rows;
};

// Get departments by organization ID (for regular admin)
exports.getDepartmentsByOrganization = async (organizationId) => {
  const query = `
    SELECT d.*, o.organization_name,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.deleted_at IS NULL) as number_of_employees
    FROM departments d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.organization_id = ? 
    AND d.is_active = 1
    ORDER BY d.created_at DESC
  `;
  const [rows] = await db.query(query, [organizationId]);
  return rows;
};

// Get a department by ID
exports.getDepartmentById = async (id) => {
  const query = `
    SELECT d.*, o.organization_name,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.deleted_at IS NULL) as number_of_employees
    FROM departments d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.id = ?
    LIMIT 1
  `;
  const [rows] = await db.query(query, [id]);
  return rows[0] || null;
};

// Get department by ID AND organization ID (for security)
exports.getDepartmentByIdAndOrganization = async (id, organizationId) => {
  const query = `
    SELECT d.*, o.organization_name,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.deleted_at IS NULL) as number_of_employees
    FROM departments d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.id = ? 
    AND d.organization_id = ?
    LIMIT 1
  `;
  const [rows] = await db.query(query, [id, organizationId]);
  return rows[0] || null;
};

// Get a department by code (with optional organization filter)
exports.getDepartmentByCode = async (departmentCode, organizationId = null) => {
  let query = `
    SELECT d.*, o.organization_name,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.deleted_at IS NULL) as number_of_employees
    FROM departments d
    LEFT JOIN organizations o ON d.organization_id = o.id
    WHERE d.department_code = ?
  `;
  const params = [departmentCode];

  if (organizationId) {
    query += ' AND d.organization_id = ?';
    params.push(organizationId);
  }

  query += ' LIMIT 1';
  const [rows] = await db.query(query, params);
  return rows[0] || null;
};

// Update department details
exports.updateDepartment = async (id, data, organizationId = null) => {
  let query = 'UPDATE departments SET ';
  const updates = [];
  const values = [];

  if (data.department_name !== undefined) {
    updates.push('department_name = ?');
    values.push(data.department_name);
  }
  if (data.department_type !== undefined) {
    updates.push('department_type = ?');
    values.push(data.department_type);
  }
  if (data.hod !== undefined) {
    updates.push('hod = ?');
    values.push(data.hod || '');
  }
  if (data.department_email !== undefined) {
    updates.push('department_email = ?');
    values.push(data.department_email);
  }
  if (data.department_description !== undefined) {
    updates.push('department_description = ?');
    values.push(data.department_description || '');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  query += updates.join(', ') + ' WHERE id = ?';
  values.push(id);

  if (organizationId) {
    query += ' AND organization_id = ?';
    values.push(organizationId);
  }

  const [result] = await db.query(query, values);
  return result.affectedRows > 0;
};

// ✅ SOFT DELETE — NOT HARD DELETE
exports.deleteDepartment = async (id, organizationId = null) => {
  // First check if department exists
  let checkQuery = 'SELECT id, organization_id FROM departments WHERE id = ?';
  const checkParams = [id];

  if (organizationId) {
    checkQuery += ' AND organization_id = ?';
    checkParams.push(organizationId);
  }

  const [existing] = await db.query(checkQuery, checkParams);
  if (existing.length === 0) {
    return false;
  }

  // 🔥 SOFT DELETE (NOT HARD DELETE)
  let deleteQuery = `
    UPDATE departments
    SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const deleteParams = [id];

  if (organizationId) {
    deleteQuery += ' AND organization_id = ?';
    deleteParams.push(organizationId);
  }

  const [result] = await db.query(deleteQuery, deleteParams);
  return result.affectedRows > 0;
};
