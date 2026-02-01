// controllers/parameterController.js
const Parameter = require('../models/Parameter');
const getUserFromRequest = (req) => {
  console.log("user is hitttt in paramter ocntroller");
  return req.user || null;
};

exports.createParameter = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { parameter_name, description } = req.body;
    const organization_id = user?.organizationId;
    const parameter_id = await Parameter.create(parameter_name, description, organization_id);
    res.status(201).json({ success: true, parameter_id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllParameters = async (req, res) => {
  try {
    const user=getUserFromRequest(req);
    const organization_id =user?.organizationId;
    console.log("oraganziation id is ",organization_id);
    const parameters = await Parameter.getAll(organization_id);
    res.json(parameters);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Update parameter
exports.updateParameter = async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { parameter_id } = req.params;
    const { parameter_name, description } = req.body;
    const organization_id = user?.organizationId;

    if (!parameter_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Parameter name is required' });
    }

    const result = await Parameter.update(parameter_id, parameter_name.trim(), description, organization_id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Parameter not found or access denied' });
    }

    res.json({ success: true, message: 'Parameter updated successfully' });
  } catch (error) {
    console.error('Update parameter error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};