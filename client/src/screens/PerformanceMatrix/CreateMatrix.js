// src/pages/CreateMatrix.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import { FaPlus, FaBook, FaSearch, FaLayerGroup, FaCheckCircle } from "react-icons/fa";
import { EditIcon, DeleteIcon, NoDepartmentImg } from "../../assets";
import "./CreateMatrix.css";
import axios from 'axios';
import { toast } from 'react-toastify';
import SuccessModal from '../../modals/SuccessModal';
import ParameterLibraryModal from './ParameterLibraryModal';

const CreateMatrix = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.state?.isEdit || false;
  const matrixToEdit = location.state?.matrixToEdit;

  const [matrixName, setMatrixName] = useState("");
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [totalWeightage, setTotalWeightage] = useState(0);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const total = selectedParameters.reduce((sum, p) => sum + (Number(p.weightage) || 0), 0);
    setTotalWeightage(total);
  }, [selectedParameters]);

  useEffect(() => {
    if (location.state?.selectedParameters) {
      setSelectedParameters(location.state.selectedParameters);
      setMatrixName(location.state.matrixName || "");
    } else if (isEditMode && matrixToEdit) {
      setMatrixName(matrixToEdit.matrix_name || "");
      const params = matrixToEdit.parameters.map(p => ({
        parameter_id: p.parameter_id,
        parameter_name: p.parameter_name,
        description: p.description || "",
        weightage: Number(p.weightage) || 0,
        category: p.category || "General"
      }));
      setSelectedParameters(params);
    }
  }, [location.state, isEditMode, matrixToEdit]);

  const handleWeightageChange = (paramId, value) => {
    const numValue = Number(value) || 0;
    const currentParam = selectedParameters.find(p => p.parameter_id === paramId);
    const currentWeight = currentParam?.weightage || 0;
    const newTotal = totalWeightage - currentWeight + numValue;

    if (newTotal > 100) {
      toast.error(`Cannot exceed 100% total weightage. Current: ${totalWeightage}%`);
      return;
    }

    const updated = selectedParameters.map(p =>
      p.parameter_id === paramId ? { ...p, weightage: numValue } : p
    );
    setSelectedParameters(updated);
  };

  const handleRemoveParameter = (paramId) => {
    const updated = selectedParameters.filter(p => p.parameter_id !== paramId);
    setSelectedParameters(updated);
    toast.info("Parameter removed");
  };

  const handleEditParameter = (param) => {
    navigate("/add-parameters", {
      state: {
        matrixName,
        existingParameters: selectedParameters,
        selectedParameter: param,
        isEdit: true,
        isEditingMatrix: isEditMode,
        matrixToEdit: matrixToEdit
      }
    });
  };

  const handleAddFromLibrary = (paramsToAdd) => {
    const newParams = paramsToAdd.map(p => ({
      parameter_id: p.id,
      parameter_name: p.parameter_name,
      description: p.description,
      category: p.category,
      weightage: 0
    }));

    setSelectedParameters(prev => [...prev, ...newParams]);
    toast.success(`Added ${newParams.length} parameter(s). Please set weightages.`);
  };

  const handleSave = async (saveAsActive = false) => {
    if (!matrixName.trim()) {
      toast.error('Enter Name of Matrix First');
      return;
    }
    if (selectedParameters.length === 0) {
      toast.error('Please add at least one parameter');
      return;
    }

    if (totalWeightage > 100) {
      toast.error('Total weightage cannot exceed 100%');
      return;
    }

    if (saveAsActive && totalWeightage !== 100) {
      toast.error('Total weightage must be exactly 100% to activate matrix');
      return;
    }

    const parametersToSave = selectedParameters.map(p => ({
      parameter_id: p.parameter_id,
      weightage: Number(p.weightage) || 0
    }));

    const status = saveAsActive ? 'active' : 'Draft';

    try {
      const config = getAuthConfig();
      setLoading(true);

      if (isEditMode && matrixToEdit?.matrix_id) {
        await axios.put(`http://localhost:5000/api/matrices/${matrixToEdit.matrix_id}`, {
          matrix_name: matrixName.trim(),
          parameters: parametersToSave,
          status
        }, config);
        toast.success(`Matrix ${status === 'active' ? 'activated' : 'updated as draft'} successfully!`);
      } else {
        await axios.post('http://localhost:5000/api/matrices', {
          matrix_name: matrixName.trim(),
          parameters: parametersToSave,
          status
        }, config);
        toast.success(`Matrix ${status === 'active' ? 'created and activated' : 'saved as draft'} successfully!`);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/performance-matrix');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save matrix");
    } finally {
      setLoading(false);
    }
  };

  const getWeightageStatusColor = () => {
    if (totalWeightage === 100) return '#22c55e';
    if (totalWeightage > 100) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div className="create-matrix-container">
      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={isEditMode ? "Matrix updated successfully." : "Matrix created successfully."}
      />

      <ParameterLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddParameters={handleAddFromLibrary}
        existingParameterIds={selectedParameters.map(p => p.parameter_id)}
      />

      <div className="matrix-top-section">
        <div className="matrix-name-wrapper">
          <h1 className="matrix-title">{isEditMode ? "Update Performance Matrix" : "Create Performance Matrix"}</h1>
          <p className="matrix-subtitle">Build a performance evaluation matrix by selecting parameters and assigning weightages.</p>

          <div className="matrix-form">
            <AddInputField
              label="Matrix Name"
              placeholder="e. Engineering Team Annual Review"
              value={matrixName}
              onChange={(e) => setMatrixName(e.target.value)}
            />

            {selectedParameters.length > 0 && (
              <div className="weightage-display" style={{ borderLeft: `5px solid ${getWeightageStatusColor()}` }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Total Weightage:</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: getWeightageStatusColor(), marginLeft: '10px' }}>
                    {totalWeightage} / 100
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {totalWeightage === 100 ? "Ready to Activate" : "Must be 100% to Activate"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="how-it-works-card">
          <h4>How this works</h4>
          <div className="info-item">
            <FaSearch className="info-icon" />
            <span className="info-text">Choose parameters from the library</span>
          </div>
          <div className="info-item">
            <FaLayerGroup className="info-icon" />
            <span className="info-text">Adjust weightages (total must be 100%)</span>
          </div>
          <div className="info-item">
            <FaCheckCircle className="info-icon" />
            <span className="info-text">Save as Draft or Activate matrix</span>
          </div>
        </div>
      </div>

      {selectedParameters.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Selected Parameters</h3>

            <div style={{ display: 'flex' }}>
              <button
                className="add-parameter-btn"
                onClick={() => setIsLibraryOpen(true)}
              >
                <FaBook style={{ marginRight: '8px' }} />
                Browse Library
              </button>

              <button
                className="add-parameter-btn"
                style={{ backgroundColor: 'white', color: '#003366', border: '1px solid #003366', marginRight: 0 }}
                onClick={() => {
                  navigate("/add-parameters", {
                    state: {
                      matrixName,
                      existingParameters: selectedParameters,
                      isEditingMatrix: isEditMode,
                      matrixToEdit: matrixToEdit
                    }
                  });
                }}
              >
                <FaPlus style={{ marginRight: '8px' }} />
                Create Custom
              </button>
            </div>
          </div>

          <table className="matrix-table">
            <thead>
              <tr>
                <th>Parameter Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Weightage (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedParameters.map((param) => (
                <tr key={param.parameter_id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{param.parameter_name}</div>
                    <small style={{ color: '#888' }}>{param.category}</small>
                  </td>
                  <td>{param.description || "-"}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={param.weightage || 0}
                      onChange={(e) => handleWeightageChange(param.parameter_id, e.target.value)}
                      style={{
                        width: '60px',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        textAlign: 'center'
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        className="organization-icon-button"
                        onClick={() => handleEditParameter(param)}
                      >
                        <img src={EditIcon} alt="Edit" className="organization-icon organization-edit-icon" />
                      </button>
                      <span style={{ margin: '0 8px', color: '#ddd' }}>|</span>
                      <button
                        className="organization-icon-button"
                        onClick={() => handleRemoveParameter(param.parameter_id)}
                      >
                        <img src={DeleteIcon} alt="Remove" className="organization-icon organization-delete-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="button-group">
            <button
              className="save-btn"
              style={{ backgroundColor: '#6c757d', marginRight: '10px' }}
              onClick={() => handleSave(false)}
              disabled={totalWeightage > 100 || loading}
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              className="save-btn"
              onClick={() => handleSave(true)}
              disabled={totalWeightage !== 100 || loading}
            >
              {loading ? 'Saving...' : (isEditMode ? "Update & Activate" : "Save & Activate")}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-matrix-state">
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>📊</div>
          <p className="empty-message" style={{ fontSize: '18px', color: '#888' }}>
            There is no Parameter yet
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="add-parameter-btn"
              onClick={() => setIsLibraryOpen(true)}
            >
              <FaBook style={{ marginRight: '8px' }} />
              Browse Parameter Library
            </button>

            <button
              className="add-parameter-btn"
              style={{ backgroundColor: 'white', color: '#003366', border: '1px solid #003366', marginLeft: '10px' }}
              onClick={() => {
                navigate("/add-parameters", {
                  state: {
                    matrixName,
                    existingParameters: selectedParameters,
                    isEditingMatrix: isEditMode,
                    matrixToEdit: matrixToEdit
                  }
                });
              }}
            >
              <FaPlus style={{ marginRight: '8px' }} />
              Create Custom
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMatrix;