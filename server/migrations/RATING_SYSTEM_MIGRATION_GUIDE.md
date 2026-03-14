# Rating System Migration Guide

## Overview
This migration changes the evaluation system from direct score entry (0-100) to a 1-5 rating scale with automatic score calculation.

## Changes Summary

### Database Changes
1. **New Column**: `rating` (TINYINT 1-5) added to `evaluation_details` table
2. **Auto-Calculation**: Score is now automatically calculated as `(rating / 5) * 100`
3. **New Triggers**: Automatic score calculation on insert/update
4. **Reference View**: `rating_score_reference` for easy lookup

### Rating to Score Mapping
| Rating | Score | Label          |
|--------|-------|----------------|
| 1      | 20%   | Poor           |
| 2      | 40%   | Below Average  |
| 3      | 60%   | Average        |
| 4      | 80%   | Good           |
| 5      | 100%  | Excellent      |

## Migration Steps

### 1. Backup Your Database
```bash
mysqldump -u root -p saas_perfomix > backup_before_rating_migration.sql
```

### 2. Run the Migration
```bash
mysql -u root -p saas_perfomix < server/migrations/change_to_rating_system.sql
```

### 3. Verify the Migration
```sql
-- Check the rating column exists
DESCRIBE evaluation_details;

-- Check rating-score reference
SELECT * FROM rating_score_reference;

-- Verify existing data was migrated
SELECT id, evaluation_id, parameter_id, rating, score 
FROM evaluation_details 
WHERE rating IS NOT NULL 
LIMIT 10;

-- Check triggers exist
SHOW TRIGGERS LIKE 'evaluation_details';
```

### 4. Update Application Code

#### Backend Changes Required:

**File: `server/controllers/evaluationController.js`**
```javascript
// OLD: Accept score directly
const { parameter_id, score, comments } = req.body;

// NEW: Accept rating and let DB calculate score
const { parameter_id, rating, comments } = req.body;

// Insert with rating instead of score
await pool.query(
  'INSERT INTO evaluation_details (evaluation_id, parameter_id, rating, comments) VALUES (?, ?, ?, ?)',
  [evaluationId, parameter_id, rating, comments]
);
```

**File: `server/routes/evaluations.js`**
```javascript
// Update validation to expect rating (1-5) instead of score (0-100)
body('rating')
  .isInt({ min: 1, max: 5 })
  .withMessage('Rating must be between 1 and 5'),
```

#### Frontend Changes Required:

**File: `client/src/screens/Evaluation/EvaluationForm.js`**
```javascript
// OLD: Number input for score (0-100)
<input 
  type="number" 
  min="0" 
  max="100" 
  value={score}
  onChange={(e) => setScore(e.target.value)}
/>

// NEW: Rating selector (1-5)
<select 
  value={rating}
  onChange={(e) => setRating(e.target.value)}
>
  <option value="">Select Rating</option>
  <option value="1">1 - Poor</option>
  <option value="2">2 - Below Average</option>
  <option value="3">3 - Average</option>
  <option value="4">4 - Good</option>
  <option value="5">5 - Excellent</option>
</select>

// Or use a star rating component
<StarRating 
  rating={rating} 
  onChange={setRating}
  max={5}
/>
```

**File: `client/src/components/RatingInput.js`** (New Component)
```javascript
import React from 'react';
import './RatingInput.css';

const RatingInput = ({ value, onChange, disabled = false }) => {
  const ratings = [
    { value: 1, label: 'Poor' },
    { value: 2, label: 'Below Average' },
    { value: 3, label: 'Average' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Excellent' }
  ];

  return (
    <div className="rating-input">
      {ratings.map((rating) => (
        <label key={rating.value} className="rating-option">
          <input
            type="radio"
            name="rating"
            value={rating.value}
            checked={value === rating.value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            disabled={disabled}
          />
          <span className="rating-label">
            {rating.value} - {rating.label}
          </span>
        </label>
      ))}
    </div>
  );
};

export default RatingInput;
```

### 5. API Response Changes

**Before:**
```json
{
  "evaluation_id": 123,
  "parameter_id": 17,
  "score": 85.00,
  "comments": "Good performance"
}
```

**After:**
```json
{
  "evaluation_id": 123,
  "parameter_id": 17,
  "rating": 4,
  "score": 80.00,
  "comments": "Good performance"
}
```

Note: `score` is still returned but is now auto-calculated from `rating`.

## Rollback Instructions

If you need to revert the changes:

```bash
mysql -u root -p saas_perfomix < server/migrations/rollback_rating_system.sql
```

**Warning**: Rolling back will remove the `rating` column. Make sure to backup any rating data you want to preserve.

## Testing Checklist

- [ ] Database migration completed without errors
- [ ] Existing evaluation data migrated correctly
- [ ] New evaluations can be created with ratings
- [ ] Scores are auto-calculated correctly
- [ ] Overall scores update when ratings change
- [ ] Line manager evaluation uses rating system
- [ ] Admin evaluation of line managers uses rating system
- [ ] Reports display ratings and scores correctly
- [ ] PDF exports show ratings
- [ ] Performance matrix calculations work correctly

## Common Issues

### Issue 1: Trigger Not Working
**Symptom**: Score not auto-calculating
**Solution**: Check trigger exists
```sql
SHOW TRIGGERS LIKE 'evaluation_details';
```

### Issue 2: Rating Validation Fails
**Symptom**: Cannot insert ratings outside 1-5
**Solution**: This is expected behavior. Ensure frontend only sends 1-5.

### Issue 3: Existing Scores Look Wrong
**Symptom**: Migrated ratings don't match original scores exactly
**Solution**: The migration uses ranges to convert scores to ratings. This is expected:
- 90-100 → Rating 5
- 70-89 → Rating 4
- 50-69 → Rating 3
- 30-49 → Rating 2
- 0-29 → Rating 1

## Support

If you encounter issues:
1. Check the database error logs
2. Verify all triggers are created
3. Test with a single evaluation first
4. Review the application logs for API errors

## Next Steps After Migration

1. Update user documentation
2. Train evaluators on new 1-5 rating system
3. Update any reports or dashboards
4. Consider adding rating distribution charts
5. Update email templates if they mention scores
