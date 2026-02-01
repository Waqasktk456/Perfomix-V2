import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./view-parameters.css";
import { DeleteIcon, EditIcon } from "../../assets";
import axios from 'axios';

const ViewParameters = () => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/parameters');
      setParameters(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch parameters');
      setLoading(false);
      console.error('Error fetching parameters:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading parameters...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="view-parameters-container">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb">
        <span>Performance Matrix</span> &gt;
        <span className="active"> View Parameters</span>
      </div>

      {/* Parameters Table */}
      <div className="table-container">
        <table className="parameters-table">
          <thead>
            <tr>
              <th>
                Parameter Name <span className="sort-icon"></span>
              </th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr key={param.parameter_id}>
                <td>{param.parameter_name}</td>
                <td>{param.description}</td>
                <td className={param.status === 'active' ? 'active' : 'inactive'}>
                  {param.status.charAt(0).toUpperCase() + param.status.slice(1)}
                </td>
                <td>
                  <img src={EditIcon} alt="Edit" className="icon edit-icon" />
                  <span className="divider">/</span>
                  <img src={DeleteIcon} alt="Delete" className="icon delete-icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewParameters; 