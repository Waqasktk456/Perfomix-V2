const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');

// Debug middleware
router.use((req, res, next) => {
  console.log(`Organization route: ${req.method} ${req.url}`);
  next();
});

// Create a new organization
router.post('/', async (req, res) => {
  try {
    console.log('Creating organization:', req.body);
    await organizationController.createOrganization(req, res);
  } catch (error) {
    console.error('Error in create organization route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organization by user ID (for regular admins)
router.get('/user/:userId', async (req, res) => {
  try {
    console.log('Getting organization for user:', req.params.userId);
    await organizationController.getOrganizationByUser(req, res);
  } catch (error) {
    console.error('Error in get user organization route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all organizations (for super admin only)
router.get('/', async (req, res) => {
  try {
    console.log('Getting all organizations');
    await organizationController.getAllOrganizations(req, res);
  } catch (error) {
    console.error('Error in get all organizations route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific organization by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('Getting organization:', req.params.id);
    await organizationController.getOrganization(req, res);
  } catch (error) {
    console.error('Error in get organization route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an organization
router.put('/:id', async (req, res) => {
  try {
    console.log('Updating organization:', req.params.id);
    await organizationController.updateOrganization(req, res);
  } catch (error) {
    console.error('Error in update organization route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an organization
router.delete('/:id', async (req, res) => {
  try {
    console.log('Deleting organization:', req.params.id);
    await organizationController.deleteOrganization(req, res);
  } catch (error) {
    console.error('Error in delete organization route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;