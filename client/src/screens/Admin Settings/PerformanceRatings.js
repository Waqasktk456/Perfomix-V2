import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getPerformanceRatings,
  createPerformanceRating,
  updatePerformanceRating,
  deletePerformanceRating,
  validateCoverage
} from '../../services/performanceRatingService';
import './PerformanceRatings.css';

const PerformanceRatings = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRating, setEditingRating] = useState(null);
  const [coverageValid, setCoverageValid] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    min_score: '',
    max_score: '',
    color: '#4CAF50',
    bg_color: '#E8F5E9',
    display_order: 0
  });

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const data = await getPerformanceRatings(true);
      setRatings(data);
      checkCoverage();
    } catch (error) {
      toast.error('Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  };

  const checkCoverage = async () => {
    try {
      const result = await validateCoverage();
      setCoverageValid(result.isValid);
      if (!result.isValid) {
        toast.warning('Rating coverage is incomplete. Ensure ranges cover 0-100 without gaps.');
      }
    } catch (error) {
      console.error('Coverage validation error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        min_score: parseFloat(formData.min_score),
        max_score: parseFloat(formData.max_score),
        display_order: parseInt(formData.display_order) || 0
      };

      if (editingRating) {
        await updatePerformanceRating(editingRating.id, data);
        toast.success('Rating updated successfully');
      } else {
        await createPerformanceRating(data);
        toast.success('Rating created successfully');
      }

      setShowModal(false);
      setEditingRating(null);
      resetForm();
      fetchRatings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rating');
    }
  };

  const handleEdit = (rating) => {
    setEditingRating(rating);
    setFormData({
      name: rating.name,
      min_score: rating.min_score,
      max_score: rating.max_score,
      color: rating.color,
      bg_color: rating.bg_color || rating.color,
      display_order: rating.display_order
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rating?')) return;
    
    try {
      await deletePerformanceRating(id);
      toast.success('Rating deleted successfully');
      fetchRatings();
    } catch (error) {
      toast.error('Failed to delete rating');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      min_score: '',
      max_score: '',
      color: '#4CAF50',
      bg_color: '#E8F5E9',
      display_order: 0
    });
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingRating(null);
    resetForm();
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="performance-ratings-container">
      <div className="ratings-header">
        <h1>Performance Ratings Configuration</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Add New Rating
        </button>
      </div>

      {!coverageValid && (
        <div className="coverage-warning">
          ⚠️ Warning: Rating ranges do not fully cover 0-100 or have gaps. Please review your configuration.
        </div>
      )}

      <div className="ratings-table-container">
        <table className="ratings-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Rating Name</th>
              <th>Score Range</th>
              <th>Color Preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ratings.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  No ratings configured. Add your first rating to get started.
                </td>
              </tr>
            ) : (
              ratings.map((rating) => (
                <tr key={rating.id}>
                  <td>{rating.display_order}</td>
                  <td>{rating.name}</td>
                  <td>{rating.min_score} - {rating.max_score}</td>
                  <td>
                    <div className="color-preview">
                      <div 
                        className="color-box" 
                        style={{ 
                          backgroundColor: rating.bg_color || rating.color,
                          border: `2px solid ${rating.color}`
                        }}
                      />
                      <span>{rating.color}</span>
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn-edit" 
                      onClick={() => handleEdit(rating)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDelete(rating.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingRating ? 'Edit Rating' : 'Add New Rating'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rating Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Excellent, Good"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Score *</label>
                  <input
                    type="number"
                    name="min_score"
                    value={formData.min_score}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Max Score *</label>
                  <input
                    type="number"
                    name="max_score"
                    value={formData.max_score}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Color *</label>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    name="bg_color"
                    value={formData.bg_color}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingRating ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceRatings;
