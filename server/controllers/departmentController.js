const Department = require('../models/departmentModel');

// Helper: Extract user from JWT
const getUserFromRequest = (req) => {
  return req.user || null;
};

exports.createDepartment = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const body = req.body;

    let organizationId;

    if (user?.role === 'super_admin') {
      organizationId = body.organization_id || body.Organization_id;
    } else {
      organizationId = user?.organizationId;
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const departmentData = {
      organization_id: organizationId,
      department_code: body.Department_code || body.department_code,
      department_name: body.Department_name || body.department_name,
      department_type: body.Department_type || body.department_type,
      hod: body.HOD || body.hod || '',
      department_email: body.Department_email_address || body.department_email,
      department_description: body.Department_description || ''
    };

    if (!departmentData.department_code || !departmentData.department_name || !departmentData.department_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await Department.createDepartment(departmentData);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result
    });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

exports.getAllDepartments = async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    if (user?.role === 'super_admin') {
      const departments = await Department.getAllDepartments();
      return res.json(departments);
    }

    const organizationId = user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Access denied: No organization associated with your account'
      });
    }

    const departments = await Department.getDepartmentsByOrganization(organizationId);
    res.json(departments);
  } catch (err) {
    console.error('Fetch departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const { identifier } = req.params;
    const user = getUserFromRequest(req);

    let department;
    let organizationId;

    if (user?.role !== 'super_admin') {
      organizationId = user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: 'Access denied: No organization associated' });
      }
    }

    if (!isNaN(identifier)) {
      if (user?.role === 'super_admin') {
        department = await Department.getDepartmentById(identifier);
      } else {
        department = await Department.getDepartmentByIdAndOrganization(identifier, organizationId);
      }
    } else {
      if (user?.role === 'super_admin') {
        const orgId = req.query.organizationId;
        department = await Department.getDepartmentByCode(identifier, orgId);
      } else {
        department = await Department.getDepartmentByCode(identifier, organizationId);
      }
    }

    if (!department) {
      return res.status(404).json({ message: 'Department not found or access denied' });
    }

    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { identifier } = req.params;
    const user = getUserFromRequest(req);
    const updates = req.body;

    let departmentId;
    let organizationId;

    if (user?.role !== 'super_admin') {
      organizationId = user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: 'Forbidden: No organization associated' });
      }
    }

    if (!isNaN(identifier)) {
      if (user?.role === 'super_admin') {
        const dept = await Department.getDepartmentById(identifier);
        if (!dept) return res.status(404).json({ message: 'Not found' });
        organizationId = dept.organization_id;
        departmentId = identifier;
      } else {
        const dept = await Department.getDepartmentByIdAndOrganization(identifier, organizationId);
        if (!dept) return res.status(404).json({ message: 'Department not found in your organization' });
        departmentId = identifier;
      }
    } else {
      if (user?.role === 'super_admin') {
        organizationId = req.query.organizationId;
        if (!organizationId) return res.status(400).json({ error: 'Organization ID required for code lookup' });
      }

      const dept = await Department.getDepartmentByCode(identifier, organizationId);
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      departmentId = dept.id;

      if (user?.role !== 'super_admin' && dept.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Cannot access department from another organization' });
      }
    }

    const data = {
      department_name: updates.Department_name,
      department_type: updates.Department_type,
      hod: updates.HOD || updates.hod || '',
      department_email: updates.Department_email_address,
      department_description: updates.Department_description || ''
    };

    const success = await Department.updateDepartment(departmentId, data, organizationId);

    if (!success) return res.status(404).json({ message: 'Department not found or already deleted' });

    res.json({ success: true, message: 'Department updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { identifier } = req.params;
    const user = getUserFromRequest(req);

    let departmentId, organizationId;

    if (user?.role !== 'super_admin') {
      organizationId = user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ error: 'Forbidden: No organization associated' });
      }
    }

    if (!isNaN(identifier)) {
      if (user?.role === 'super_admin') {
        const dept = await Department.getDepartmentById(identifier);
        if (!dept) return res.status(404).json({ message: 'Not found' });
        organizationId = dept.organization_id;
        departmentId = identifier;
      } else {
        const dept = await Department.getDepartmentByIdAndOrganization(identifier, organizationId);
        if (!dept) return res.status(404).json({ message: 'Department not found in your organization' });
        departmentId = identifier;
      }
    } else {
      if (user?.role === 'super_admin') {
        organizationId = req.query.organizationId;
        if (!organizationId) return res.status(400).json({ error: 'Organization ID required for code lookup' });
      }

      const dept = await Department.getDepartmentByCode(identifier, organizationId);
      if (!dept) return res.status(404).json({ message: 'Not found' });
      departmentId = dept.id;

      if (user?.role !== 'super_admin' && dept.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Cannot delete department from another organization' });
      }
    }

    const success = await Department.deleteDepartment(departmentId, organizationId);
    if (!success) return res.status(404).json({ message: 'Department not found' });

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};
