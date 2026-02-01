const organizationModel = require('../models/organizationModel');
const mysql = require("mysql2/promise");

// DB Pool - MUST match your database name
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "saas_perfomix",
});

// Create a new organization
const createOrganization = async (req, res) => {
  try {
    const organizationData = req.body;
    const userId = organizationData.userId;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "userId is required" 
      });
    }

    // Check if user already has an organization
    const [existingOrg] = await pool.query(
      'SELECT id FROM organizations WHERE created_by = ? AND deleted_at IS NULL',
      [userId]
    );

    if (existingOrg.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has an organization'
      });
    }

    // Map frontend field names to database field names
    const dbData = {
      organization_name: organizationData.Organization_name,
      business_email: organizationData.Business_email_address,
      industry_type: organizationData.Industry_type,
      company_size: organizationData.Company_size,
      description: organizationData.description,
      headquarters_location: organizationData.Headquarters_location,
      website_url: organizationData.Website_URL,
      establishment_year: organizationData.Establishment_year,
      operating_countries: organizationData.Operating_in_countries,
      logo: organizationData.Logo,
      created_by: userId
    };

    // 1. Create the organization
    const results = await organizationModel.createOrganization(dbData);
    const organizationId = results.insertId;

    // 2. UPDATE USER: set organization_id + has_completed_onboarding = 1
    await pool.query(
      `UPDATE users 
       SET organization_id = ?, has_completed_onboarding = 1 
       WHERE id = ?`,
      [organizationId, userId]
    );

    console.log(`✅ User ${userId} linked to organization ${organizationId}`);

    res.status(201).json({ 
      success: true,
      message: 'Organization created successfully',
      organizationId: organizationId,
      data: results 
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create organization',
      details: error.message 
    });
  }
};

// ✅ NEW: Get organization by user ID (for regular admins)
const getOrganizationByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's role first
    const [userRows] = await pool.query(
      'SELECT role, organization_id FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userRows[0];

    // If super_admin, return all organizations
    if (user.role === 'super_admin') {
      const allOrgs = await organizationModel.getAllOrganizations();
      return res.status(200).json(allOrgs);
    }

    // For regular admin, get their organization
    // Method 1: Get by created_by (organizations they created)
    const [orgsByCreator] = await pool.query(
      `SELECT * FROM organizations 
       WHERE created_by = ? AND deleted_at IS NULL AND is_active = 1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Method 2: Get by organization_id in users table (if they're part of an org)
    const [orgsByMembership] = await pool.query(
      `SELECT * FROM organizations 
       WHERE id = ? AND deleted_at IS NULL AND is_active = 1`,
      [user.organization_id]
    );

    // Combine results and remove duplicates
    const organizations = [...orgsByCreator, ...orgsByMembership];
    const uniqueOrgs = Array.from(new Map(organizations.map(org => [org.id, org])).values());

    res.status(200).json(uniqueOrgs);

  } catch (error) {
    console.error('Error fetching user organizations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
};

// Get all organizations (for super admin)
const getAllOrganizations = async (req, res) => {
  try {
    const results = await organizationModel.getAllOrganizations();
    
    if (!Array.isArray(results)) {
      return res.status(200).json([]);
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organizations' });
  }
};

// Get a specific organization by ID
const getOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await organizationModel.getOrganizationById(id);
    
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    res.status(200).json(results[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch organization' });
  }
};

// Update an organization
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationData = req.body;
    
    // Map frontend field names to database field names
    const dbData = {
      organization_name: organizationData.Organization_name,
      business_email: organizationData.Business_email_address,
      industry_type: organizationData.Industry_type,
      company_size: organizationData.Company_size,
      description: organizationData.description,
      headquarters_location: organizationData.Headquarters_location,
      website_url: organizationData.Website_URL,
      establishment_year: organizationData.Establishment_year,
      operating_countries: organizationData.Operating_in_countries,
      logo: organizationData.Logo
    };

    const results = await organizationModel.updateOrganization(id, dbData);
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Organization updated successfully',
      data: results 
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ success: false, error: 'Failed to update organization' });
  }
};

// Delete an organization (soft delete)
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await organizationModel.deleteOrganization(id);
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ success: false, error: 'Failed to delete organization' });
  }
};

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationByUser // ✅ Export new method
};