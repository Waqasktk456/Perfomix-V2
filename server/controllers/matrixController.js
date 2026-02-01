// controllers/matrixController.js
const Matrix = require('../models/Matrix');
const EvaluationCycle = require('../models/EvaluationCycle');

const getUserFromRequest = (req) => {
  return req.user || null;
};

const matrixController = {
  createMatrix: async (req, res) => {
    try {
      const user = getUserFromRequest(req);
      const { matrix_name, parameters, status = 'Draft' } = req.body;

      const organization_id = user?.organizationId;
      const created_by = user?.id;

      if (!organization_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized: No organization' });
      }

      if (!matrix_name?.trim()) {
        return res.status(400).json({ success: false, message: 'Matrix name is required' });
      }

      if (!Array.isArray(parameters) || parameters.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one parameter required' });
      }

      const result = await Matrix.create(matrix_name.trim(), organization_id, created_by, parameters, status);
      res.status(201).json(result);
    } catch (error) {
      console.error('Create matrix error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getAllMatrices: async (req, res) => {
    try {
      const user = getUserFromRequest(req);
      const organization_id = user?.organizationId;

      if (!organization_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const matrices = await Matrix.getAll(organization_id);
      res.json({ success: true, data: matrices });
    } catch (error) {
      console.error('getAllMatrices error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getMatrixById: async (req, res) => {
    try {
      const user = getUserFromRequest(req);
      const organization_id = user?.organizationId;
      const { matrix_id } = req.params;

      if (!organization_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const matrix = await Matrix.getById(matrix_id, organization_id);
      if (!matrix) {
        return res.status(404).json({ success: false, message: 'Matrix not found' });
      }

      res.json({ success: true, data: matrix });
    } catch (error) {
      console.error('getMatrixById error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateMatrix: async (req, res) => {
    try {
      const user = getUserFromRequest(req);
      const organization_id = user?.organizationId;
      const { matrix_id } = req.params;
      const { matrix_name, parameters, status = 'Draft' } = req.body;

      // Check if matrix is in active cycle
      const activeMatrices = await EvaluationCycle.checkMatrixInActiveCycle([matrix_id]);
      if (activeMatrices.length > 0) {
        return res.status(400).json({ success: false, message: 'Matrix is in an active cycle cannot be edit or delete' });
      }

      if (!organization_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (!matrix_name?.trim()) {
        return res.status(400).json({ success: false, message: 'Matrix name is required' });
      }

      if (!Array.isArray(parameters) || parameters.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one parameter required' });
      }

      const result = await Matrix.update(matrix_id, matrix_name.trim(), organization_id, parameters, status);
      res.json(result);
    } catch (error) {
      console.error('updateMatrix error:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to update matrix' });
    }
  },

  deleteMatrix: async (req, res) => {
    try {
      const user = getUserFromRequest(req);
      const organization_id = user?.organizationId;
      const { matrix_id } = req.params;

      // Check if matrix is in active cycle
      const activeMatrices = await EvaluationCycle.checkMatrixInActiveCycle([matrix_id]);
      if (activeMatrices.length > 0) {
        return res.status(400).json({ success: false, message: 'Matrix is in an active cycle cannot be edit or delete' });
      }

      if (!organization_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await Matrix.delete(matrix_id, organization_id);
      res.json(result);
    } catch (error) {
      console.error('deleteMatrix error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = matrixController;