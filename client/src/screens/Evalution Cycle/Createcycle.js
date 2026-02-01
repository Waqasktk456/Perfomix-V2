// src/pages/CreateCycle.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import axios from "axios";
import { toast } from "react-toastify";
import SuccessModal from "../../modals/SuccessModal";
import "./Createcycle.css";

const CreateCycle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.state?.isEdit || false;
  const cycleToEdit = location.state?.cycleToEdit;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if (isEditMode && cycleToEdit) {
      setName(cycleToEdit.name);
      setStartDate(cycleToEdit.start_date.split("T")[0]);
      setEndDate(cycleToEdit.end_date.split("T")[0]);
    }
  }, [isEditMode, cycleToEdit]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Cycle name is required");
    if (!startDate || !endDate) return toast.error("Dates are required");
    if (new Date(endDate) <= new Date(startDate))
      return toast.error("End date must be after start date");

    try {
      setLoading(true);
      const config = getAuthConfig();

      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/cycles/${cycleToEdit.id}`, {
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
        }, config);
        toast.success("Cycle updated (still draft)");
      } else {
        await axios.post("http://localhost:5000/api/cycles", {
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
        }, config);
        toast.success("Cycle created as draft");
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate("/evaluation-cycle");
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-matrix-container">
      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={isEditMode ? "Cycle updated" : "Cycle created as draft"}
      />

      <div className="breadcrumb">
        <span>Evaluation Cycles</span> &gt;{" "}
        <span className="active">{isEditMode ? "Edit Cycle" : "Create Cycle"}</span>
      </div>

      <div className="matrix-form">
        <AddInputField
          label="Cycle Name"
          placeholder="e.g., Q4 2025 Performance Review"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div style={{ flex: 1 }}>
          <label className="input-label">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>

        <div style={{ flex: 1 }}>
          <label className="input-label">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      {isEditMode && cycleToEdit?.status !== "draft" && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#fee2e2", borderRadius: "8px", color: "#991b1b" }}>
          <strong>Note:</strong> This cycle is {cycleToEdit.status}. Only draft cycles can be edited.
        </div>
      )}

      <div className="action-buttons" style={{ marginTop: "40px" }}>
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={loading || (isEditMode && cycleToEdit?.status !== "draft")}
        >
          {loading ? "Saving..." : isEditMode ? "Update Draft" : "Save as Draft"}
        </button>

        <button
          className="create-matrix-btn"
          onClick={() => navigate("/evaluation-cycle")}
        >
          Back to List
        </button>
      </div>

      <p style={{ marginTop: "20px", color: "#6b7280", fontSize: "14px" }}>
        Note: You can activate the cycle later from the list when teams are assigned.
      </p>
    </div>
  );
};

export default CreateCycle;