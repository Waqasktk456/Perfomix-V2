import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Department.css";
import axios from 'axios';
import SuccessModal from '../../modals/SuccessModal';

const AddDepartment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.dept;
  const [formData, setFormData] = useState({
    Department_code: '',
    Organization_id: '',
    Department_name: '',
    Department_type: 'Technical',
    HOD: '',
    Department_email_address: '',
    Department_description: ''
  });
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationName, setOrganizationName] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get axios config with token
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user info from localStorage
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
        const token = localStorage.getItem('token');

        setUserRole(role);

        if (!userId || !token) {
          setError('User not logged in');
          navigate('/login');
          return;
        }

        const config = getAuthConfig();

        // Fetch organizations based on user role
        let orgsData;
        if (role === 'super_admin') {
          // Super admin sees all organizations
          const response = await axios.get('http://localhost:5000/api/organizations', config);
          orgsData = response.data;
        } else {
          // Regular admin sees only their organization
          const response = await axios.get(`http://localhost:5000/api/organizations/user/${userId}`, config);
          orgsData = response.data;
        }

        setOrganizations(orgsData);

        // Set default organization (first one or user's organization)
        if (orgsData.length > 0) {
          const defaultOrg = orgsData[0];
          setOrganizationName(defaultOrg.organization_name);

          setFormData(prev => ({
            ...prev,
            Organization_id: defaultOrg.id // ✅ Auto-set organization ID
          }));

          // Fetching organizations covers what's needed.
        } else {
          setError('No organization found. Please create an organization first.');
        }

        // If editing, populate form with existing data
        if (isEdit) {
          setFormData({
            Department_code: isEdit.department_code || isEdit.Department_code,
            Organization_id: isEdit.organization_id || isEdit.Organization_id,
            Department_name: isEdit.department_name || isEdit.Department_name,
            Department_type: isEdit.department_type || isEdit.Department_type,
            HOD: isEdit.hod || isEdit.HOD || '',
            Department_email_address: isEdit.department_email || isEdit.Department_email_address,
            Department_description: isEdit.department_description || isEdit.Department_description || ''
          });

          // Set organization name for display
          const editOrg = orgsData.find(org => org.id === (isEdit.organization_id || isEdit.Organization_id));
          if (editOrg) {
            setOrganizationName(editOrg.organization_name);
          }
        }

      } catch (err) {
        console.error('Error loading data:', err);
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/login');
        } else {
          setError('Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isEdit, navigate]);

  // Fetching organizations and handling data loading already covers what's needed.
  // Parent department fetching logic removed.

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If organization changes
    if (name === 'Organization_id') {
      // Update organization name for display
      const selectedOrg = organizations.find(org => org.id === parseInt(value));
      if (selectedOrg) {
        setOrganizationName(selectedOrg.organization_name);
      }

      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Organization_id) {
      setError('Organization is required');
      return;
    }

    console.log('Submitting department data:', formData);

    try {
      const config = getAuthConfig();

      if (isEdit) {
        // Use department ID for update
        const deptId = isEdit.id || isEdit.Department_code;
        await axios.put(
          `http://localhost:5000/api/departments/${deptId}`,
          formData,
          config
        );
      } else {
        await axios.post(
          'http://localhost:5000/api/departments',
          formData,
          config
        );
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/departments");
      }, 2000);
    } catch (err) {
      console.error('Error saving department:', err);

      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to save department');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (organizations.length === 0) {
    return (
      <div className="add-department-container">
        <div className="error-message">
          No organization found. Please create an organization first.
        </div>
        <button onClick={() => navigate('/add-organization')}>
          Create Organization
        </button>
      </div>
    );
  }

  return (
    <div className="add-department-container">
      <nav className="breadcrumb">
        <span>Department &gt;</span> <span className="active">{isEdit ? 'Edit Department' : 'Add Department'}</span>
      </nav>
      {error && <div className="error-message">{error}</div>}
      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={isEdit ? "Department updated successfully." : "Department added successfully."}
      />
      <form onSubmit={handleSubmit} className="department-form-grid">
        <div className="department-row">
          <div className="department-col">
            <label className="department-input-label">Organization *</label>
            {userRole === 'super_admin' && organizations.length > 1 ? (
              // Super admin with multiple orgs - show dropdown
              <select
                className="department-input-field"
                name="Organization_id"
                value={formData.Organization_id}
                onChange={handleChange}
                required
                disabled={isEdit}
              >
                <option value="">Select Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.organization_name}
                  </option>
                ))}
              </select>
            ) : (
              // Regular admin or single org - show as text (read-only)
              <input
                type="text"
                className="department-input-field"
                value={organizationName}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            )}
          </div>
          <div className="department-col">
            <label className="department-input-label">Department Name *</label>
            <input
              type="text"
              className="department-input-field"
              name="Department_name"
              value={formData.Department_name}
              onChange={handleChange}
              required
              placeholder="Enter Department Name"
            />
          </div>
        </div>
        <div className="department-row">
          <div className="department-col">
            <label className="department-input-label">Department Code *</label>
            <input
              type="text"
              className="department-input-field"
              name="Department_code"
              value={formData.Department_code}
              onChange={handleChange}
              required
              disabled={isEdit}
              placeholder="Enter Department Code"
            />
          </div>
          <div className="department-col">
            <label className="department-input-label">Department Type *</label>
            <select
              className="department-input-field"
              name="Department_type"
              value={formData.Department_type}
              onChange={handleChange}
              required
            >
              <option value="">Select Department Type</option>
              <option value="Technical">Technical</option>
              <option value="Administrative">Administrative</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="department-row">
          <div className="department-col">
            <label className="department-input-label">Head of Department (HOD) *</label>
            <input
              type="text"
              className="department-input-field"
              name="HOD"
              value={formData.HOD}
              onChange={handleChange}
              required
              placeholder="Enter Head of Department Name"
            />
          </div>
          <div className="department-col">
            <label className="department-input-label">Department Email *</label>
            <input
              type="email"
              className="department-input-field"
              name="Department_email_address"
              value={formData.Department_email_address}
              onChange={handleChange}
              required
              placeholder="Enter Department Email"
            />
          </div>
        </div>
        <div className="department-row">
          <div className="department-col full-width">
            <label className="department-input-label">Department Description</label>
            <input
              type="text"
              className="department-input-field"
              name="Department_description"
              value={formData.Department_description}
              onChange={handleChange}
              placeholder="Enter Department Description"
            />
          </div>
        </div>
        <div className="department-form-actions">
          <button
            type="button"
            className="department-btn department-cancel"
            onClick={() => navigate("/departments")}
          >
            Cancel
          </button>
          <button type="submit" className="department-btn department-save">
            {isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDepartment;