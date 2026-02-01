import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./view-organization.css";
import '../../styles/typography.css';
import {
  ZaptaLogo,
  AdminIcon,
  ContactIcon,
  DepartmentIcon,
  EmployeesIcon,
  EmployeeAdressIcon,
  EyeIcon,
  DashboardIcon,
  ReleationshipEmployeeIcon,
  PerformanceReportIcon
} from "../../assets";
import { organizationService } from '../../services/organizationService';

const ViewOrganization = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        if (location.state?.organization) {
          setOrganization(location.state.organization);
        } else {
          // If no organization data is passed, you might want to handle this case
          setError("No organization data available");
        }
      } catch (err) {
        setError(err.error || 'Failed to load organization details');
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, [location.state]);

  if (loading) {
    return <div className="loading">Loading organization details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!organization) {
    return <div className="error">No organization data available</div>;
  }

  return (
    <div className="view-org-container">
      {/* Header Section */}
      <div className="view-org-header">
        <h1>Organization Details</h1>
      </div>

      {/* Organization Content */}
      <div className="view-org-content">
        <div className="view-org-logo-section">
          <img
            src={organization.logo || ZaptaLogo}
            alt="Organization Logo"
            className="view-org-logo"
          />
          <h2 className="view-org-name">{organization.organization_name}</h2>
        </div>

        <div className="view-org-details">
          {(organization.id || organization.business_email) && (
            <div className="view-org-detail-row">
              {organization.id && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={AdminIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Registration ID</label>
                    <p>{organization.id}</p>
                  </div>
                </div>
              )}
              {organization.business_email && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={ContactIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Business Email</label>
                    <p>{organization.business_email}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(organization.industry_type || organization.company_size) && (
            <div className="view-org-detail-row">
              {organization.industry_type && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={DepartmentIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Industry Type</label>
                    <p>{organization.industry_type}</p>
                  </div>
                </div>
              )}
              {organization.company_size && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={EmployeesIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Company Size</label>
                    <p>{organization.company_size}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(organization.headquarters_location || organization.website_url) && (
            <div className="view-org-detail-row">
              {organization.headquarters_location && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={EmployeeAdressIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Headquarters Location</label>
                    <p>{organization.headquarters_location}</p>
                  </div>
                </div>
              )}
              {organization.website_url && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={EyeIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Website</label>
                    <p>
                      <a href={organization.website_url} target="_blank" rel="noopener noreferrer">
                        {organization.website_url}
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(organization.establishment_year || organization.operating_countries) && (
            <div className="view-org-detail-row">
              {organization.establishment_year && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={DashboardIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Establishment Year</label>
                    <p>{organization.establishment_year}</p>
                  </div>
                </div>
              )}
              {organization.operating_countries && (
                <div className="view-org-detail-item">
                  <div className="view-org-detail-icon-wrapper">
                    <img src={ReleationshipEmployeeIcon} alt="" className="view-org-detail-icon" />
                  </div>
                  <div className="view-org-detail-info">
                    <label>Operating Countries</label>
                    <p>{organization.operating_countries}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {organization.description && (
            <div className="view-org-detail-row full-width">
              <div className="view-org-detail-item">
                <div className="view-org-detail-icon-wrapper">
                  <img src={PerformanceReportIcon} alt="" className="view-org-detail-icon" />
                </div>
                <div className="view-org-detail-info">
                  <label>Description</label>
                  <p>{organization.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewOrganization;
