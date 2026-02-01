// controllers/templateController.js
const db = require('../config/db');

// Get all available templates
exports.getAllTemplates = async (req, res) => {
  try {
    const [templates] = await db.query(`
      SELECT 
        mt.id AS template_id,
        mt.template_name,
        mt.description,
        mt.industry_type,
        mt.organization_size,
        mt.icon,
        mt.usage_count,
        mt.created_at,
        COUNT(tp.id) AS parameter_count,
        SUM(tp.weightage) AS total_weightage
      FROM matrix_templates mt
      LEFT JOIN template_parameters tp ON mt.id = tp.template_id
      WHERE mt.is_active = 1
      GROUP BY mt.id
      ORDER BY mt.usage_count DESC, mt.created_at DESC
    `);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Get template details with parameters
exports.getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;

    // Get template basic info
    const [templates] = await db.query(`
      SELECT * FROM matrix_templates WHERE id = ? AND is_active = 1
    `, [templateId]);

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get template parameters
    const [parameters] = await db.query(`
      SELECT 
        tp.id,
        tp.parameter_id,
        p.parameter_name,
        p.description,
        p.category,
        tp.weightage,
        tp.is_required
      FROM template_parameters tp
      JOIN parameters p ON tp.parameter_id = p.id
      WHERE tp.template_id = ?
      ORDER BY tp.weightage DESC
    `, [templateId]);

    res.json({
      success: true,
      template: {
        ...templates[0],
        parameters
      }
    });
  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template details',
      error: error.message
    });
  }
};

// Create matrix from template
exports.createMatrixFromTemplate = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { template_id, matrix_name, customize_parameters } = req.body;
    const organization_id = req.user.organizationId;
    console.log(organization_id);
    const created_by = req.user.id;

    if (!template_id || !matrix_name) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Template ID and Matrix Name are required'
      });
    }

    // Check if template exists
    const [templates] = await connection.query(`
      SELECT * FROM matrix_templates WHERE id = ? AND is_active = 1
    `, [template_id]);

    if (templates.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get template parameters
    const [templateParams] = await connection.query(`
      SELECT parameter_id, weightage
      FROM template_parameters
      WHERE template_id = ?
    `, [template_id]);

    // Use customized parameters if provided, otherwise use template defaults
    let parametersToUse = templateParams;
    
    if (customize_parameters && Array.isArray(customize_parameters)) {
      // Merge customizations with template parameters
      parametersToUse = templateParams.map(tp => {
        const custom = customize_parameters.find(cp => cp.parameter_id === tp.parameter_id);
        return custom ? { ...tp, weightage: custom.weightage } : tp;
      });
    }

    // Calculate total weightage
    const totalWeightage = parametersToUse.reduce((sum, p) => sum + parseInt(p.weightage), 0);
    const status = totalWeightage === 100 ? 'active' : 'Draft';

    // Create the matrix
    const [matrixResult] = await connection.query(`
      INSERT INTO performance_matrices (organization_id, matrix_name, created_by, status)
      VALUES (?, ?, ?, ?)
    `, [organization_id, matrix_name, created_by, status]);

    const matrix_id = matrixResult.insertId;

    // Insert parameters
    for (const param of parametersToUse) {
      await connection.query(`
        INSERT INTO parameter_matrices (matrix_id, parameter_id, weightage)
        VALUES (?, ?, ?)
      `, [matrix_id, param.parameter_id, param.weightage]);
    }

    // Increment template usage count
    await connection.query(`
      UPDATE matrix_templates SET usage_count = usage_count + 1 WHERE id = ?
    `, [template_id]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Matrix created successfully from template',
      matrix_id,
      status
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create matrix from template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create matrix from template',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Create custom template (for super admin)
exports.createTemplate = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { template_name, description, industry_type, icon, parameters } = req.body;
    const created_by = req.user.id;

    if (!template_name || !industry_type || !parameters || parameters.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Template name, industry type, and parameters are required'
      });
    }

    // Create template
    const [templateResult] = await connection.query(`
      INSERT INTO matrix_templates (template_name, description, industry_type, icon, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [template_name, description, industry_type, icon || '📊', created_by]);

    const template_id = templateResult.insertId;

    // Insert parameters
    for (const param of parameters) {
      await connection.query(`
        INSERT INTO template_parameters (template_id, parameter_id, weightage, is_required)
        VALUES (?, ?, ?, ?)
      `, [template_id, param.parameter_id, param.weightage, param.is_required || 1]);
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Template created successfully',
      template_id
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Search templates by industry or keyword
exports.searchTemplates = async (req, res) => {
  try {
    const { industry, keyword } = req.query;
    
    let query = `
      SELECT 
        mt.id AS template_id,
        mt.template_name,
        mt.description,
        mt.industry_type,
        mt.icon,
        mt.usage_count,
        COUNT(tp.id) AS parameter_count,
        SUM(tp.weightage) AS total_weightage
      FROM matrix_templates mt
      LEFT JOIN template_parameters tp ON mt.id = tp.template_id
      WHERE mt.is_active = 1
    `;
    
    const params = [];

    if (industry) {
      query += ` AND mt.industry_type = ?`;
      params.push(industry);
    }

    if (keyword) {
      query += ` AND (mt.template_name LIKE ? OR mt.description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` GROUP BY mt.id ORDER BY mt.usage_count DESC`;

    const [templates] = await db.query(query, params);

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Search templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search templates',
      error: error.message
    });
  }
};

module.exports = {
  getAllTemplates: exports.getAllTemplates,
  getTemplateById: exports.getTemplateById,
  createMatrixFromTemplate: exports.createMatrixFromTemplate,
  createTemplate: exports.createTemplate,
  searchTemplates: exports.searchTemplates
};