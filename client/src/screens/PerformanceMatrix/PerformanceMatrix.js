// src/pages/PerformanceMatrix.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PerformanceMatrix.css";
import { EditIcon, DeleteIcon } from "../../assets";
import axios from 'axios';
import { toast } from 'react-toastify';

const PerformanceMatrices = () => {
  const navigate = useNavigate();
  const [matrices, setMatrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatrix, setSelectedMatrix] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error("No authentication token found");
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchMatrices();
  }, []);

  const fetchMatrices = async () => {
    try {
      const config = getAuthConfig();
      const response = await axios.get('http://localhost:5000/api/matrices', config);
      setMatrices(response.data.data || []);
      console.log("Matrices fetched:", response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch matrices');
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (matrix) => {
    if (matrix.is_in_active_cycle > 0) {
      toast.error("Matrix is in an active cycle cannot be edit or delete");
      return;
    }
    const id = matrix.matrix_id;
    if (!window.confirm("Are you sure you want to delete this matrix?")) return;
    try {
      const config = getAuthConfig();
      await axios.delete(`http://localhost:5000/api/matrices/${id}`, config);
      toast.success('Matrix deleted successfully');
      setMatrices(matrices.filter(m => m.matrix_id !== id));
      if (selectedMatrix?.matrix_id === id) setSelectedMatrix(null);
    } catch (err) {
      toast.error('Failed to delete matrix');
    }
  };

  const handleEdit = (matrix) => {
    console.log(`Checking matrix ${matrix.matrix_name}: is_in_active_cycle=${matrix.is_in_active_cycle}`);
    if (matrix.is_in_active_cycle > 0) {
      toast.error("Matrix is in an active cycle cannot be edit or delete");
      return;
    }
    navigate('/create-matrix', {
      state: {
        isEdit: true,
        matrixToEdit: matrix
      }
    });
  };

  const handleRowClick = (matrix) => {
    setSelectedMatrix(matrix);
  };

  const handleViewMatrix = () => {
    if (!selectedMatrix) {
      toast.error('Please select a matrix');
      return;
    }
    navigate('/view-matrix', { state: { matrix: selectedMatrix } });
  };

  if (loading) return <div className="loading">Loading matrices...</div>;

  return (
    <div className="container">
      <div className="header-section">
        <h2 className="Matricestitle">Performance Matrices</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>MATRIX ID</th>
            <th>NAME</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {matrices.length > 0 ? (
            matrices.map((matrix) => (
              <tr
                key={matrix.matrix_id}
                className={selectedMatrix?.matrix_id === matrix.matrix_id ? 'selected-row' : ''}
                onClick={() => handleRowClick(matrix)}
                style={{ cursor: 'pointer' }}
              >
                <td>{matrix.matrix_id}</td>
                <td>{matrix.matrix_name}</td>
                <td>{matrix.status || 'active'}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(matrix)}
                    className="icon-btn"
                    aria-label="Edit"
                  >
                    <img src={EditIcon} alt="Edit" className="icon edit-icon" />
                  </button>
                  <span className="divider">/</span>
                  <button
                    onClick={() => handleDelete(matrix)}
                    className="icon-btn"
                    aria-label="Delete"
                  >
                    <img src={DeleteIcon} alt="Delete" className="icon delete-icon" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="no-data">No matrices found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="action-buttons">
        <button className="view-matrix-btn" onClick={handleViewMatrix}>
          View Matrix
        </button>
        <button
          className="create-matrix-btn"
          onClick={() => navigate("/create-matrix")}
        >
          ✏️ Create Matrix
        </button>
      </div>
    </div>
  );
};

export default PerformanceMatrices;