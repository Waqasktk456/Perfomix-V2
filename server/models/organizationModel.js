const db = require('../config/db');

const createOrganization = async (data) => {
  try {
    // Convert establishment_year to integer
    const establishmentYear = data.establishment_year ? parseInt(data.establishment_year) : null;

    // Valid ENUM values from saas_perfomix schema
    const validCompanySizes = ['1-10','11-50','51-200','201-500','501-1000','1000+'];

    // Map frontend values to database ENUM
    const companySizeMap = {
      'Small (1-100)': '1-10',
      'Medium (101-500)': '51-200',
      'Large (501 and above)': '501-1000',
      '1-10': '1-10',
      '11-50': '11-50',
      '51-200': '51-200',
      '201-500': '201-500',
      '501-1000': '501-1000',
      '1000+': '1000+'
    };

    // Default company size
    const companySize = companySizeMap[data.company_size?.trim()] || '1-10';

    // Industry type - database accepts any VARCHAR, defaults to 'Other'
    const industryType = data.industry_type?.trim() || 'Other';

    // SQL matches saas_perfomix schema exactly
    const sql = `
      INSERT INTO organizations 
      (organization_name, business_email, industry_type, company_size, 
      description, headquarters_location, website_url, establishment_year, 
      operating_countries, logo, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    console.log('Creating organization with values:', {
      organization_name: data.organization_name,
      business_email: data.business_email,
      industry_type: industryType,
      company_size: companySize,
      created_by: data.created_by
    });

    const [results] = await db.execute(sql, [
      data.organization_name,
      data.business_email,
      industryType,
      companySize,
      data.description || null,
      data.headquarters_location || null,
      data.website_url || null,
      establishmentYear,
      data.operating_countries || null,
      data.logo || null,
      data.created_by // ✅ This links to the admin user
    ]);

    return results;
  } catch (error) {
    console.error('SQL Error:', error);
    throw error;
  }
};

// READ organization by ID
const getOrganizationById = async (id) => {
  try {
    const sql = 'SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL';
    const [rows] = await db.execute(sql, [id]);
    return rows;
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw error;
  }
};

// READ all organizations (only active ones)
const getAllOrganizations = async () => {
  try {
    const sql = `
      SELECT * FROM organizations 
      WHERE deleted_at IS NULL AND is_active = 1
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql);
    console.log('Fetched organizations:', rows);
    return rows || [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

// UPDATE organization
const updateOrganization = async (id, data) => {
  try {
    // Map company size if needed
    const companySizeMap = {
      'Small (1-100)': '1-10',
      'Medium (101-500)': '51-200',
      'Large (501 and above)': '501-1000'
    };
    
    const companySize = companySizeMap[data.company_size?.trim()] || data.company_size || '1-10';
    const establishmentYear = data.establishment_year ? parseInt(data.establishment_year) : null;

    const sql = `
      UPDATE organizations SET
      organization_name = ?, 
      business_email = ?, 
      industry_type = ?, 
      company_size = ?, 
      description = ?, 
      headquarters_location = ?, 
      website_url = ?, 
      establishment_year = ?, 
      operating_countries = ?, 
      logo = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL`;

    const [results] = await db.execute(sql, [
      data.organization_name,
      data.business_email,
      data.industry_type || 'Other',
      companySize,
      data.description,
      data.headquarters_location,
      data.website_url,
      establishmentYear,
      data.operating_countries,
      data.logo,
      id
    ]);

    return results;
  } catch (error) {
    console.error('Error updating organization:', error);
    throw error;
  }
};

// Soft DELETE organization
const deleteOrganization = async (id) => {
  try {
    // Soft delete - set deleted_at timestamp
    const sql = 'UPDATE organizations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [results] = await db.execute(sql, [id]);
    return results;
  } catch (error) {
    console.error('Error deleting organization:', error);
    throw error;
  }
};

// Get organization by created_by (get admin's organization)
const getOrganizationByCreator = async (userId) => {
  try {
    const sql = `
      SELECT * FROM organizations 
      WHERE created_by = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [userId]);
    return rows;
  } catch (error) {
    console.error('Error fetching organization by creator:', error);
    throw error;
  }
};

module.exports = {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getOrganizationByCreator
};