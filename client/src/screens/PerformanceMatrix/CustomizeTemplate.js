// src/pages/CustomizeTemplate.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './CustomizeTemplate.css';

const CustomizeTemplate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template;

  const [matrixName, setMatrixName] = useState('');
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if (!template) {
      toast.error('No template selected');
      navigate('/template-gallery');
      return;
    }

    fetchTemplateDetails();
  }, [template]);

  const fetchTemplateDetails = async () => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(
        `http://localhost:5000/api/templates/${template.template_id}`,
        config
      );

      setMatrixName(`${response.data.template.template_name} - ${new Date().getFullYear()}`);
      setParameters(response.data.template.parameters || []);
      setLoading(false);
    } catch (error) {
      console.error('Fetch template details error:', error);
      toast.error('Failed to load template details');
      setLoading(false);
    }
  };

  const handleWeightageChange = (parameterId, newWeightage) => {
    const numValue = Number(newWeightage) || 0;
    
    // Calculate what the new total would be
    const currentParam = parameters.find(p => p.parameter_id === parameterId);
    const currentWeight = currentParam?.weightage || 0;
    const currentTotal = parameters.reduce((sum, p) => sum + (Number(p.weightage) || 0), 0);
    const newTotal = currentTotal - currentWeight + numValue;
    
    if (newTotal > 100) {
      toast.error(`Cannot exceed 100% total. Current: ${currentTotal}%`);
      return;
    }

    setParameters(parameters.map(p =>
      p.parameter_id === parameterId
        ? { ...p, weightage: numValue }
        : p
    ));
  };

  const getTotalWeightage = () => {
    return parameters.reduce((sum, p) => sum + (Number(p.weightage) || 0), 0);
  };

  const handleUseAsIs = async () => {
    if (!matrixName.trim()) {
      toast.error('Please enter a matrix name');
      return;
    }

    setCreating(true);
    try {
      const config = getAuthConfig();
      const response = await axios.post(
        'http://localhost:5000/api/templates/use',
        {
          template_id: template.template_id,
          matrix_name: matrixName.trim(),
          customize_parameters: null // Use template as-is
        },
        config
      );

      toast.success('Matrix created successfully from template!');
      setTimeout(() => {
        navigate('/performance-matrix');
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create matrix');
    } finally {
      setCreating(false);
    }
  };

  const handleCustomize = async () => {
    if (!matrixName.trim()) {
      toast.error('Please enter a matrix name');
      return;
    }

    const totalWeightage = getTotalWeightage();
    if (totalWeightage > 100) {
      toast.error('Total weightage cannot exceed 100%');
      return;
    }

    setCreating(true);
    try {
      const config = getAuthConfig();
      const response = await axios.post(
        'http://localhost:5000/api/templates/use',
        {
          template_id: template.template_id,
          matrix_name: matrixName.trim(),
          customize_parameters: parameters.map(p => ({
            parameter_id: p.parameter_id,
            weightage: Number(p.weightage)
          }))
        },
        config
      );

      toast.success('Customized matrix created successfully!');
      setTimeout(() => {
        navigate('/performance-matrix');
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create matrix');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading template...</div>;
  }

  const totalWeightage = getTotalWeightage();
  const isValid = totalWeightage === 100;
  const canSaveDraft = totalWeightage > 0 && totalWeightage <= 100;

  return (
    <div className="customize-template-container">
      <div className="breadcrumb">
        <span onClick={() => navigate('/template-gallery')} style={{ cursor: 'pointer' }}>
          Templates
        </span> ›
        <span className="active">Customize & Use</span>
      </div>

      <div className="template-header">
        <div className="template-info">
          <div className="template-icon-large">{template.icon || '📊'}</div>
          <div>
            <h1>{template.template_name}</h1>
            <p>{template.description}</p>
            <span className="industry-tag">{template.industry_type}</span>
          </div>
        </div>
      </div>

      <div className="matrix-name-section">
        <label>Matrix Name</label>
        <input
          type="text"
          value={matrixName}
          onChange={(e) => setMatrixName(e.target.value)}
          placeholder="Enter a name for your matrix"
          className="matrix-name-input"
        />
      </div>

      {/* Weightage Status */}
      <div className={`weightage-status ${isValid ? 'valid' : canSaveDraft ? 'warning' : 'error'}`}>
        <div className="weightage-info">
          <span>Total Weightage:</span>
          <strong>{totalWeightage} / 100</strong>
        </div>
        <div className="weightage-message">
          {isValid && '✓ Perfect! Ready to activate'}
          {!isValid && canSaveDraft && '⚠️ Can save as draft, needs 100% to activate'}
          {!canSaveDraft && '✗ Exceeds 100% - reduce weightages'}
        </div>
      </div>

      {/* Parameters Table */}
      <div className="parameters-section">
        <h3>Parameters ({parameters.length})</h3>
        <p className="section-subtitle">Adjust weightages to match your needs. The total must equal 100%.</p>
        
        <table className="parameters-table">
          <thead>
            <tr>
              <th>Parameter Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Weightage (%)</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr key={param.parameter_id}>
                <td>
                  <strong>{param.parameter_name}</strong>
                </td>
                <td>{param.description || '-'}</td>
                <td>
                  <span className="category-badge">{param.category}</span>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={param.weightage}
                    onChange={(e) => handleWeightageChange(param.parameter_id, e.target.value)}
                    className="weightage-input"
                  />
                </td>
                <td>
                  {param.is_required ? (
                    <span className="required-badge">Required</span>
                  ) : (
                    <span className="optional-badge">Optional</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn-cancel"
          onClick={() => navigate('/template-gallery')}
          disabled={creating}
        >
          Cancel
        </button>

        <button
          className="btn-use-asis"
          onClick={handleUseAsIs}
          disabled={creating || !matrixName.trim()}
        >
          {creating ? 'Creating...' : 'Use As-Is'}
        </button>

        <button
          className="btn-customize"
          onClick={handleCustomize}
          disabled={creating || !canSaveDraft || !matrixName.trim()}
          style={{
            opacity: (creating || !canSaveDraft || !matrixName.trim()) ? 0.5 : 1
          }}
        >
          {creating ? 'Creating...' : isValid ? 'Create & Activate' : 'Save as Draft'}
        </button>
      </div>
    </div>
  );
};

export default CustomizeTemplate;