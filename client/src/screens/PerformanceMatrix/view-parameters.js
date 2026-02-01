import React, { useState, useEffect } from "react";
import "./view-parameters.css";
import axios from 'axios';
import { toast } from 'react-toastify';

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
      // Always set status to 'inactive' for all parameters
      let params = [];
      if (response.data && Array.isArray(response.data)) {
        params = response.data.map(param => ({ ...param, status: 'inactive' }));
      } else if (response.data && response.data.parameters) {
        params = response.data.parameters.map(param => ({ ...param, status: 'inactive' }));
      } else if (response.data && typeof response.data === 'object') {
        params = [{ ...response.data, status: 'inactive' }];
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Invalid data format received from server');
        setParameters([]);
      }
      setParameters(params);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching parameters:', err);
      setError('Failed to fetch parameters');
      setLoading(false);
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
      <div className="breadcrumb">
        <span>Performance Matrix</span> &gt;
        <span className="active"> View Parameters</span>
      </div>

      <div className="table-container">
        <table className="parameters-table">
          <thead>
            <tr>
              <th>Parameter Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters && parameters.length > 0 ? (
              parameters.map((param) => (
                <tr key={param.parameter_id}>
                  <td>{param.parameter_name}</td>
                  <td>{param.description}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="no-data">No parameters found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewParameters;
