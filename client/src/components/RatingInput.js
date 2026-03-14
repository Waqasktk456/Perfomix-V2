import React from 'react';
import './RatingInput.css';

const RatingInput = ({ value, onChange, disabled = false, showLabel = true }) => {
  const ratings = [
    { value: 1, label: '1 - Poor', color: '#EF4444' },
    { value: 2, label: '2 - Below Average', color: '#F59E0B' },
    { value: 3, label: '3 - Average', color: '#3B82F6' },
    { value: 4, label: '4 - Good', color: '#10B981' },
    { value: 5, label: '5 - Excellent', color: '#059669' }
  ];

  const selectedRating = ratings.find(r => r.value === Number(value));

  return (
    <div className="rating-input-container">
      <select
        className="rating-dropdown"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        disabled={disabled}
      >
        <option value="">Select Rating</option>
        {ratings.map((rating) => (
          <option key={rating.value} value={rating.value}>
            {rating.label}
          </option>
        ))}
      </select>
      {showLabel && selectedRating && (
        <div 
          className="rating-score-info"
          style={{ color: selectedRating.color }}
        >
          Score: {(selectedRating.value / 5 * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
};

export default RatingInput;
