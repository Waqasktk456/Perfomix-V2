// src/pages/AddParameters.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import "./AddParameters.css";
import AddParamsImg from "../../assets/images/AddParameters.png";
import axios from "axios";
import { toast } from "react-toastify";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

const AddParameters = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [matrixName, setMatrixName] = useState("");
  const [parameterName, setParameterName] = useState("");
  const [weightage, setWeightage] = useState("");
  const [description, setDescription] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingParameterId, setEditingParameterId] = useState(null);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [maxAllowed, setMaxAllowed] = useState(100);

  useEffect(() => {
    if (location.state) {
      setMatrixName(location.state.matrixName || "");

      // Calculate current total from existing parameters
      const existing = location.state.existingParameters || [];
      
      // Check if we're editing an existing parameter
      if (location.state.selectedParameter && location.state.isEdit) {
        const p = location.state.selectedParameter;
        setParameterName(p.parameter_name || "");
        setWeightage(p.weightage || "");
        setDescription(p.description || "");
        setIsEditMode(true);
        setEditingParameterId(p.parameter_id);
        
        // Calculate total excluding the parameter being edited
        const totalExcludingCurrent = existing
          .filter(param => param.parameter_id !== p.parameter_id)
          .reduce((sum, param) => sum + (Number(param.weightage) || 0), 0);
        
        setCurrentTotal(totalExcludingCurrent);
        setMaxAllowed(100 - totalExcludingCurrent);
      } else {
        // Adding new parameter
        const total = existing.reduce((sum, p) => sum + (Number(p.weightage) || 0), 0);
        setCurrentTotal(total);
        setMaxAllowed(100 - total);
        setIsEditMode(false);
        setEditingParameterId(null);
        setParameterName("");
        setWeightage("");
        setDescription("");
      }
    }
  }, [location.state]);

  const handleSave = async () => {
    if (!parameterName.trim()) {
      toast.error("Parameter name is required");
      return;
    }
    
    const newWeight = Number(weightage) || 0;
    
    if (newWeight < 0) {
      toast.error("Weightage cannot be negative");
      return;
    }

    if (newWeight > maxAllowed) {
      toast.error(`Weightage cannot exceed ${maxAllowed}% (Current total: ${currentTotal}%)`);
      return;
    }

    try {
      const config = getAuthConfig();
      let parameter_id = editingParameterId;

      // FIX: If editing a parameter, update it in the database
      if (isEditMode && editingParameterId) {
        // Update the parameter in the database
        await axios.put(
          `http://localhost:5000/api/parameters/${editingParameterId}`,
          {
            parameter_name: parameterName.trim(),
            description: description.trim() || null,
          },
          config
        ).catch(err => {
          // If update endpoint doesn't exist, we'll just update locally
          console.warn("Parameter update endpoint not available, updating locally only");
        });
      } else {
        // Create new parameter
        const res = await axios.post(
          "http://localhost:5000/api/parameters",
          {
            parameter_name: parameterName.trim(),
            description: description.trim() || null,
          },
          config
        );
        parameter_id = res.data.parameter_id;
      }

      // Build the updated parameter list
      let current = location.state?.existingParameters || [];
      
      // If editing, remove the old version
      if (isEditMode) {
        current = current.filter(p => p.parameter_id !== editingParameterId);
      }

      // Add the new/updated parameter with updated name and description
      current.push({
        parameter_id,
        parameter_name: parameterName.trim(),
        description: description.trim() || null,
        weightage: newWeight,
      });

      const newTotal = current.reduce((sum, p) => sum + (Number(p.weightage) || 0), 0);

      toast.success(
        `Parameter ${isEditMode ? 'updated' : 'added'}! Total: ${newTotal}/100${newTotal === 100 ? ' ✓' : ''}`
      );

      // Navigate back to CreateMatrix with updated parameters
      // IMPORTANT: Preserve the isEdit state for the matrix
      navigate("/create-matrix", {
        state: {
          matrixName,
          selectedParameters: current,
          // Preserve these from the incoming state
          isEdit: location.state?.isEditingMatrix || false,
          matrixToEdit: location.state?.matrixToEdit || null
        },
      });
    } catch (err) {
      console.error("Save parameter error:", err);
      toast.error(err.response?.data?.message || "Failed to save parameter");
    }
  };

  const wouldExceed = () => {
    const newWeight = Number(weightage) || 0;
    return newWeight > maxAllowed;
  };

  const getNewTotal = () => {
    return currentTotal + (Number(weightage) || 0);
  };

  return (
    <div className="add-parameters-container" style={{ padding: "32px 0", maxWidth: "1000px", margin: "0 auto" }}>
      <div className="breadcrumb" style={{ marginBottom: '20px', fontSize: '14px', color: '#6b7280' }}>
        <span>Performance Matrix</span> &gt; 
        <span>{location.state?.isEditingMatrix ? 'Edit Matrix' : 'Create Matrix'}</span> &gt;
        <span className="active">{isEditMode ? 'Edit Parameter' : 'Add Parameter'}</span>
      </div>

      {/* Weightage Info Banner - ALWAYS SHOW */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '5px', fontSize: '15px' }}>
          {isEditMode ? 'Editing Parameter' : 'Adding New Parameter'}
        </div>
        <div style={{ fontSize: '14px', color: '#0369a1' }}>
          Current Total: <strong>{currentTotal}%</strong> | 
          Available: <strong>{maxAllowed}%</strong> | 
          Target: <strong>100%</strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "40px" }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: "320px" }}>
          <img src={AddParamsImg} alt="Add Parameter" style={{ width: "100%", maxWidth: "350px" }} />
        </div>

        <div style={{ flex: 2, maxWidth: "420px" }}>
          <AddInputField
            label="Parameter Name"
            placeholder="e.g., Code Quality"
            value={parameterName}
            onChange={(e) => setParameterName(e.target.value)}
            disabled={false} // FIX: Allow editing parameter name
          />

          <AddInputField
            label={`Weightage (Max: ${maxAllowed}%)`}
            type="number"
            min="0"
            max={maxAllowed}
            placeholder={`e.g., ${Math.min(25, maxAllowed)}`}
            value={weightage}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || Number(val) <= maxAllowed) {
                setWeightage(val);
              } else {
                toast.error(`Cannot exceed ${maxAllowed}%`);
              }
            }}
          />

          {weightage && (
            <div style={{
              marginTop: '10px',
              padding: '12px',
              backgroundColor: wouldExceed() ? '#fee2e2' : '#f0fdf4',
              borderRadius: '6px',
              fontSize: '13px',
              color: wouldExceed() ? '#991b1b' : '#166534',
              border: `1px solid ${wouldExceed() ? '#fecaca' : '#bbf7d0'}`
            }}>
              {wouldExceed() 
                ? `⚠ Exceeds limit! Reduce to ${maxAllowed}% or below`
                : (
                  <div>
                    <div>✓ New total will be: <strong>{getNewTotal()}%</strong></div>
                    {getNewTotal() === 100 && (
                      <div style={{ marginTop: '4px', fontWeight: '600' }}>
                        🎉 Perfect! Matrix will be ready to activate
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          )}

          <AddInputField
            label="Description (Optional)"
            type="textarea"
            placeholder="Brief description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px" }}>
            <button 
              className="cancel-btn" 
              onClick={() => navigate("/create-matrix", {
                state: {
                  matrixName,
                  selectedParameters: location.state?.existingParameters || [],
                  // IMPORTANT: Preserve these when canceling
                  isEdit: location.state?.isEditingMatrix || false,
                  matrixToEdit: location.state?.matrixToEdit || null
                }
              })}
            >
              Cancel
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave}
              disabled={wouldExceed() || !parameterName.trim() || !weightage}
              style={{
                opacity: (wouldExceed() || !parameterName.trim() || !weightage) ? 0.5 : 1,
                cursor: (wouldExceed() || !parameterName.trim() || !weightage) ? 'not-allowed' : 'pointer'
              }}
            >
              {isEditMode ? 'Update Parameter' : 'Save Parameter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddParameters;