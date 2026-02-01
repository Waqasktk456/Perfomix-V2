import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./add-organization.css";
import { UploadIcon } from "../../assets";
import '../../styles/typography.css';
import { organizationService } from '../../services/organizationService';
import { toast } from 'react-toastify';

const AddOrganization = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logo, setLogo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    Registeration_id: "",
    Organization_name: "",
    Business_email_address: "",
    Industry_type: "",
    Company_size: "",
    description: "",
    Headquarters_location: "",
    Website_URL: "",
    Establishment_year: "",
    Operating_in_countries: "",
    Logo: ""
  });

  // ✅ FIXED: Map database fields (snake_case) to frontend fields (PascalCase)
  useEffect(() => {
    if (location.state?.organization) {
      const org = location.state.organization;
      setIsEditing(true);
      
      // Map database fields back to frontend format
      setFormData({
        Registeration_id: org.id, // ✅ Database uses 'id', not 'Registeration_id'
        Organization_name: org.organization_name || org.Organization_name || "",
        Business_email_address: org.business_email || org.Business_email_address || "",
        Industry_type: org.industry_type || org.Industry_type || "",
        Company_size: org.company_size || org.Company_size || "",
        description: org.description || "",
        Headquarters_location: org.headquarters_location || org.Headquarters_location || "",
        Website_URL: org.website_url || org.Website_URL || "",
        Establishment_year: org.establishment_year || org.Establishment_year || "",
        Operating_in_countries: org.operating_countries || org.Operating_in_countries || "",
        Logo: org.logo || org.Logo || ""
      });
      
      if (org.logo || org.Logo) {
        setLogo(org.logo || org.Logo);
      }
    }
  }, [location.state]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLogo(URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        Logo: file.name
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.Organization_name || !formData.Business_email_address) {
      setError("Please fill in all required fields");
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // GET USER ID FROM LOCALSTORAGE (set during login)
      const userId = localStorage.getItem("userId");

      if (!userId && !isEditing) {
        toast.error("User not found. Please login again.");
        navigate("/login");
        return;
      }

      // PREPARE DATA
      const dataToSend = {
        ...formData,
        ...( !isEditing && { userId } ) // ONLY SEND userId WHEN CREATING (not editing)
      };

      if (isEditing) {
        // ✅ Use the id from Registeration_id field (which now holds org.id)
        await organizationService.updateOrganization(formData.Registeration_id, formData);
        toast.success('Organization updated successfully!');
        navigate('/organization');
      } else {
        // CREATE NEW ORGANIZATION + LINK TO USER
        await organizationService.createOrganization(dataToSend);
        toast.success('Organization created successfully! Welcome to Perfomix');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.error || 'Failed to save organization');
      setError(err.error || 'Failed to save organization');
    }
  };

  const showFullLayout = isEditing || location.pathname.includes('/organization/');

  return (
    <div className={`org-container ${!showFullLayout ? 'full-screen' : ''}`}>
      <div className="org-header">
        <h1>{isEditing ? "Edit Organization" : "Welcome to Performix"}</h1>
        <p className="org-subtext">
          {isEditing ? "Edit your organization details" : "Add your organization details to get started"}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="org-form">
        {/* Row 1 */}
        <div className="org-row">
          <div className="org-field">
            <label className="org-label">Organization Name *</label>
            <input 
              type="text" 
              className="org-input" 
              placeholder="Enter name" 
              name="Organization_name"
              value={formData.Organization_name}
              onChange={handleInputChange}
            />
          
          </div>
          <div className="org-field">
            <label className="org-label">Business Email Address *</label>
            <input 
              type="email" 
              className="org-input" 
              placeholder="example@gmail.com" 
              name="Business_email_address"
              value={formData.Business_email_address}
              onChange={handleInputChange}
            />
          </div>
          <div className="org-field">
            <label className="org-label">Registration ID/Organization ID *</label>
            <input 
              type="text" 
              className="org-input" 
              placeholder="Auto-generated ID" 
              name="Registeration_id"
              value={formData.Registeration_id}
              onChange={handleInputChange}
              disabled={true}
              title="This ID is auto-generated and cannot be modified"
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="org-row">
          <div className="org-field">
            <label className="org-label">Industry Type</label>
            <select 
              className="org-input" 
              name="Industry_type"
              value={formData.Industry_type}
              onChange={handleInputChange}
            >
              <option value="">Select Industry Type</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Education">Education</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Telecommunications">Telecommunications</option>
              <option value="Construction">Construction</option>
              <option value="Government">Government</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="org-field">
            <label className="org-label">Company Size</label>
            <select 
              className="org-input" 
              name="Company_size"
              value={formData.Company_size}
              onChange={handleInputChange}
            >
              <option value="">Select Company Size</option>
              <option value="Small (1-100)">Small (1-100)</option>
              <option value="Medium (101-500)">Medium (101-500)</option>
              <option value="Large (501 and Above)">Large (501 and Above)</option>
            </select>
          </div>
          <div className="org-field">
            <label className="org-label">Headquarters Location/Address</label>
            <input 
              type="text" 
              className="org-input" 
              placeholder="Enter address" 
              name="Headquarters_location"
              value={formData.Headquarters_location}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="org-row">
          <div className="org-field">
            <label className="org-label">Website URL</label>
            <input 
              type="url" 
              className="org-input" 
              placeholder="Enter website URL" 
              name="Website_URL"
              value={formData.Website_URL}
              onChange={handleInputChange}
            />
          </div>
          <div className="org-field">
            <label className="org-label">Establishment Year</label>
            <input 
              type="number" 
              className="org-input" 
              placeholder="Enter establishment year" 
              name="Establishment_year"
              value={formData.Establishment_year}
              onChange={handleInputChange}
            />
          </div>
          <div className="org-field">
            <label className="org-label">Operating Countries</label>
            <input 
              type="text" 
              className="org-input" 
              placeholder="Enter operating countries" 
              name="Operating_in_countries"
              value={formData.Operating_in_countries}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Description */}
        <div className="org-row">
          <div className="org-field full-width">
            <label className="org-label">Description</label>
            <textarea 
              className="org-input" 
              placeholder="Enter organization description" 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
            />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="org-upload-container">
          <input type="file" id="upload-logo" accept="image/*" onChange={handleFileChange} hidden />
          <label htmlFor="upload-logo" className="org-upload-label">
            {logo ? (
              <img src={logo} alt="Uploaded Logo" className="org-upload-preview" />
            ) : (
              <>
                <img src={UploadIcon} alt="Upload Icon" className="org-upload-icon" />
                <p className="org-upload-text">Click to upload</p>
              </>
            )}
          </label>
        </div>

        <div className="org-button-group">
          <button className="org-cancel" onClick={() => navigate('/organization')}>Cancel</button>
          <button className="org-save" onClick={handleSave}>
            {isEditing ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOrganization;