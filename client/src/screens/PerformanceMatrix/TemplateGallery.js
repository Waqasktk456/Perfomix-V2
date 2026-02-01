// src/pages/TemplateGallery.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './TemplateGallery.css';

const TemplateGallery = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const config = getAuthConfig();
      const response = await axios.get('http://localhost:5000/api/templates', config);
      setTemplates(response.data.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Fetch templates error:', error);
      toast.error('Failed to load templates');
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const config = getAuthConfig();
      const params = {};
      if (selectedIndustry !== 'all') params.industry = selectedIndustry;
      if (searchKeyword) params.keyword = searchKeyword;

      const response = await axios.get('http://localhost:5000/api/templates/search', {
        ...config,
        params
      });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleUseTemplate = (template) => {
    navigate('/customize-template', {
      state: { template }
    });
  };

  const industries = ['all', 'Education', 'Information Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'];

  if (loading) {
    return <div className="loading">Loading templates...</div>;
  }

  return (
    <div className="template-gallery-container">
      <div className="gallery-header">
        <h1>Choose a Performance Matrix Template</h1>
        <p>Start with a pre-built template designed for your industry, then customize it to fit your needs</p>
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <div className="industry-filter">
          <label>Industry:</label>
          <select 
            value={selectedIndustry}
            onChange={(e) => {
              setSelectedIndustry(e.target.value);
              handleSearch();
            }}
          >
            {industries.map(ind => (
              <option key={ind} value={ind}>
                {ind === 'all' ? 'All Industries' : ind}
              </option>
            ))}
          </select>
        </div>

        <div className="search-box-template">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {templates.length === 0 ? (
          <div className="no-templates">
            <p>No templates found. Try different filters or create from scratch.</p>
            <button onClick={() => navigate('/create-matrix')}>
              Create Custom Matrix
            </button>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.template_id} className="template-card">
              <div className="template-icon">{template.icon || '📊'}</div>
              <h3>{template.template_name}</h3>
              <p className="template-description">{template.description}</p>
              
              <div className="template-meta">
                <span className="industry-badge">{template.industry_type}</span>
                <span className="usage-count">Used {template.usage_count} times</span>
              </div>

              <div className="template-stats">
                <div className="stat">
                  <span className="stat-label">Parameters</span>
                  <span className="stat-value">{template.parameter_count}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Weightage</span>
                  <span className="stat-value">{template.total_weightage}%</span>
                </div>
              </div>

              <div className="template-actions">
                <button 
                  className="btn-preview"
                  onClick={() => navigate(`/preview-template/${template.template_id}`)}
                >
                  Preview
                </button>
                <button 
                  className="btn-use-template"
                  onClick={() => handleUseTemplate(template)}
                >
                  Use Template
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create from Scratch Option */}
      <div className="create-custom-section">
        <h3>Don't see what you need?</h3>
        <p>Create a completely custom matrix from scratch</p>
        <button 
          className="btn-create-custom"
          onClick={() => navigate('/create-matrix')}
        >
          Create Custom Matrix
        </button>
      </div>
    </div>
  );
};

export default TemplateGallery;