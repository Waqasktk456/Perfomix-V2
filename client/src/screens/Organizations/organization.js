import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./organization.css";
import { DeleteIcon, EditIcon, FilterIcon } from "../../assets";
import '../../styles/typography.css';
import axios from 'axios';
import { toast } from 'react-toastify';

const Organization = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  // Helper to get token and config
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      throw new Error('No token');
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('userId');

    if (!token || !role || !id) {
      toast.error('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    setUserRole(role);
    setUserId(parseInt(id));
    loadOrganizations(role, parseInt(id));
  }, [navigate]);

  const loadOrganizations = async (role, currentUserId) => {
    try {
      setLoading(true);
      const config = getAuthConfig();

      let data;
      if (role === 'super_admin') {
        const response = await axios.get('http://localhost:5000/api/organizations', config);
        data = response.data;
      } else {
        const response = await axios.get(`http://localhost:5000/api/organizations/user/${currentUserId}`, config);
        data = response.data;
      }

      setOrganizations(data);
      if (data.length > 0) {
        setSelectedOrg(data[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading organizations:', err);
      const message = err.response?.data?.error || 'Failed to load organizations';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (organization) => {
    if (userRole === 'super_admin' || organization.created_by === userId) {
      navigate('/add-organization', { state: { organization } });
    } else {
      toast.error('You can only edit organizations you created');
    }
  };

  const handleDelete = async (orgId) => {
    const organization = organizations.find(org => org.id === orgId);

    if (userRole !== 'super_admin' && organization?.created_by !== userId) {
      toast.error('You can only delete organizations you created');
      return;
    }

    if (!window.confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return;
    }

    try {
      const config = getAuthConfig();
      await axios.delete(`http://localhost:5000/api/organizations/${orgId}`, config);
      toast.success('Organization deleted successfully');
      loadOrganizations(userRole, userId);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete organization';
      toast.error(message);
    }
  };

  const handleRowClick = (organization) => {
    setSelectedOrg(organization);
  };

  const handleViewDetails = () => {
    if (selectedOrg) {
      navigate('/view-organization', { state: { organization: selectedOrg } });
    } else {
      toast.info('Please select an organization first');
    }
  };

  const formatField = (value) => {
    return value ? value : '--';
  };

  if (loading) {
    return <div className="loading">Loading organizations...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (organizations.length === 0) {
    return (
      <div className="no-organizations">
        <h2>No Organizations Found</h2>
        <p>You haven't created any organizations yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Organization Table */}
      <table className="organization-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>
              Organization Name <img src={FilterIcon} alt="Filter" className="filter-icon" />
            </th>
            <th>Industry Type</th>
            <th>Company Size</th>
            <th>Address</th>
            <th>Email</th>
            <th>Website</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr
              key={org.id}
              onClick={() => handleRowClick(org)}
              className={selectedOrg?.id === org.id ? 'selected-row' : ''}
              style={{ cursor: 'pointer' }}
            >
              <td>{formatField(org.id)}</td>
              <td>{formatField(org.organization_name)}</td>
              <td>{formatField(org.industry_type)}</td>
              <td>{formatField(org.company_size)}</td>
              <td>{formatField(org.headquarters_location)}</td>
              <td>
                {org.business_email ? (
                  <a href={`mailto:${org.business_email}`} className="organization-email">
                    {org.business_email}
                  </a>
                ) : (
                  '--'
                )}
              </td>
              <td>
                {org.website_url ? (
                  <a href={org.website_url} target="_blank" rel="noopener noreferrer" className="organization-email">
                    {org.website_url}
                  </a>
                ) : (
                  '--'
                )}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(org)}
                  className="organization-icon-button"
                  aria-label="Edit Organization"
                >
                  <img src={EditIcon} alt="Edit" className="organization-icon organization-edit-icon" />
                </button>
                <span>/</span>
                <button
                  onClick={() => handleDelete(org.id)}
                  className="organization-icon-button"
                  aria-label="Delete Organization"
                >
                  <img src={DeleteIcon} alt="Delete" className="organization-icon organization-delete-icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="action-buttons" style={{ marginTop: '30px', textAlign: 'right' }}>
        <button
          className="view-matrix-btn"
          onClick={handleViewDetails}
          disabled={!selectedOrg}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default Organization;