import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const organizationService = {
  // Create a new organization
  createOrganization: async (organizationData) => {
    try {
      const response = await axios.post(`${API_URL}/organizations`, organizationData);
      return response.data;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error.response?.data || { error: 'Failed to create organization' };
    }
  },

  // Get all organizations (super admin only)
  getAllOrganizations: async () => {
    try {
      const response = await axios.get(`${API_URL}/organizations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error.response?.data || { error: 'Failed to fetch organizations' };
    }
  },

  // Get organizations by user ID (regular admin)
  getOrganizationsByUser: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/organizations/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user organizations:', error);
      throw error.response?.data || { error: 'Failed to fetch organizations' };
    }
  },

  // Get a specific organization by ID
  getOrganizationById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/organizations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error.response?.data || { error: 'Failed to fetch organization' };
    }
  },

  // Update an organization
  updateOrganization: async (id, organizationData) => {
    try {
      const response = await axios.put(`${API_URL}/organizations/${id}`, organizationData);
      return response.data;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error.response?.data || { error: 'Failed to update organization' };
    }
  },

  // Delete an organization (soft delete)
  deleteOrganization: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/organizations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error.response?.data || { error: 'Failed to delete organization' };
    }
  }
};