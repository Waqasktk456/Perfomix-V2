import axios from 'axios';

const API_URL = 'http://localhost:5000/api/departments';

export const departmentService = {
  // Create a new department
  createDepartment: async (departmentData) => {
    try {
      const response = await axios.post(API_URL, departmentData);
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },

  // Get department by code
  getDepartment: async (departmentCode) => {
    try {
      const response = await axios.get(`${API_URL}/${departmentCode}`);
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },

  // Update department
  updateDepartment: async (departmentCode, departmentData) => {
    try {
      const response = await axios.put(`${API_URL}/${departmentCode}`, departmentData);
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },

  // Delete department
  deleteDepartment: async (departmentCode) => {
    try {
      const response = await axios.delete(`${API_URL}/${departmentCode}`);
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },

  // Get all departments
  getAllDepartments: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }
}; 