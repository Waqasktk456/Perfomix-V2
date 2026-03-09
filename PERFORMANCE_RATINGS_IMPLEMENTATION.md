# Performance Ratings System - Implementation Guide

## Overview
This document describes the database-driven performance rating system that replaces hardcoded thresholds throughout the application.

## Database Schema

### Table: `performance_ratings`
```sql
CREATE TABLE performance_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    min_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    color VARCHAR(7) NOT NULL,
    bg_color VARCHAR(7),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_score_range CHECK (min_score >= 0 AND max_score <= 100 AND min_score < max_score),
    CONSTRAINT unique_org_name UNIQUE (organization_id, name)
);
```

### Evaluations Table Updates
```sql
ALTER TABLE evaluations 
ADD COLUMN rating_id INT NULL,
ADD COLUMN rating_name VARCHAR(50) NULL,
ADD CONSTRAINT fk_evaluations_rating FOREIGN KEY (rating_id) REFERENCES performance_ratings(id) ON DELETE SET NULL;
```

## Backend Implementation

### Files Created
1. **server/models/PerformanceRating.js** - Model for database operations
2. **server/controllers/performanceRatingController.js** - Business logic
3. **server/routes/performanceRatingRoutes.js** - API endpoints

### API Endpoints
- `GET /api/performance-ratings` - Get all ratings for organization
- `GET /api/performance-ratings/score/:score` - Get rating for specific score
- `GET /api/performance-ratings/validate-coverage` - Validate 0-100 coverage
- `POST /api/performance-ratings` - Create new rating
- `PUT /api/performance-ratings/:id` - Update rating
- `DELETE /api/performance-ratings/:id` - Delete rating

## Frontend Implementation

### Files Created
1. **client/src/services/performanceRatingService.js** - API service with caching
2. **client/src/screens/Admin Settings/PerformanceRatings.js** - Management UI
3. **client/src/screens/Admin Settings/PerformanceRatings.css** - Styles

### Service Functions
```javascript
import { getPerformanceRating } from '../../services/performanceRatingService';

// Usage in components
const rating = await getPerformanceRating(85.5);
// Returns: { level: 'Excellent', color: '#4CAF50', bg: '#E8F5E9', id: 1 }
```

## Files to Update (Remove Hardcoded Thresholds)

### UI Components
1. **client/src/screens/Performance Report/view-performance-report.js**
   - Replace `getPerformanceLevel` function with service call
   
2. **client/src/Staff/screens/StaffDashboard/staff-dashboard.js**
   - Replace `getPerformanceLevel` function with service call
   
3. **client/src/LineManager/screens/linemanager-performance.js**
   - Replace `getPerformanceLevel` function with service call
   
4. **client/src/screens/LineManagerEvaluation/LineManagerPerformance.js**
   - Replace `getPerformanceLevel` function with service call

### PDF Generators
5. **client/src/utils/professionalReportGenerator.js**
   - Replace `getPerformanceLevel` function with service call
   
6. **client/src/utils/enhancedOrgReportPDF.js**
   - Replace `getPerformanceLevel` function with service call
   
7. **client/src/utils/enhancedOrgReportPDF_COMPLETE.js**
   - Replace `getPerformanceLevel` function with service call
   
8. **client/src/screens/Reports/IndividualReport.js**
   - Replace `getPerformanceLevel` function with service call

## Migration Pattern

### Before (Hardcoded)
```javascript
const getPerformanceLevel = (score) => {
  if (score >= 90) return { level: "Excellent", color: "#4CAF50" };
  if (score >= 80) return { level: "Very Good", color: "#8BC34A" };
  if (score >= 70) return { level: "Good", color: "#FFC107" };
  if (score >= 60) return { level: "Satisfactory", color: "#FF9800" };
  return { level: "Needs Improvement", color: "#F44336" };
};
```

### After (Database-Driven)
```javascript
import { getPerformanceRating } from '../../services/performanceRatingService';

// In component
const [performance, setPerformance] = useState({ level: 'Loading...', color: '#9E9E9E' });

useEffect(() => {
  const fetchRating = async () => {
    const rating = await getPerformanceRating(totalScore);
    setPerformance(rating);
  };
  fetchRating();
}, [totalScore]);
```

## Default Ratings
When organizations are created, these default ratings are automatically inserted:

| Name | Min Score | Max Score | Color | Display Order |
|------|-----------|-----------|-------|---------------|
| Excellent | 90.00 | 100.00 | #4CAF50 | 1 |
| Very Good | 80.00 | 89.99 | #8BC34A | 2 |
| Good | 70.00 | 79.99 | #FFC107 | 3 |
| Satisfactory | 60.00 | 69.99 | #FF9800 | 4 |
| Needs Improvement | 0.00 | 59.99 | #F44336 | 5 |

## Validation Rules
1. **No Overlaps**: Rating ranges cannot overlap
2. **Full Coverage**: Ranges must cover 0-100 without gaps
3. **Valid Range**: min_score < max_score
4. **Score Bounds**: 0 ≤ min_score, max_score ≤ 100

## Admin UI Features
- Create, edit, delete ratings
- Visual color picker
- Real-time validation
- Coverage validation warnings
- Sortable by display order

## Benefits
1. **Consistency**: Single source of truth for all ratings
2. **Flexibility**: Organizations can customize their rating scales
3. **Historical Accuracy**: Ratings stored with evaluations preserve history
4. **Maintainability**: No code changes needed to adjust thresholds
5. **Multi-tenancy**: Each organization has independent rating scales

## Next Steps
1. Run SQL migration: `create_performance_ratings_table.sql`
2. Update all 8 files listed above to use the service
3. Add route to App.js for Performance Ratings page
4. Test rating CRUD operations
5. Test evaluation flow with rating storage
6. Verify PDF reports use database ratings

## Testing Checklist
- [ ] Create new rating
- [ ] Edit existing rating
- [ ] Delete rating
- [ ] Validate overlap detection
- [ ] Validate coverage check
- [ ] Test rating retrieval by score
- [ ] Verify UI components use database ratings
- [ ] Verify PDF reports use database ratings
- [ ] Test with multiple organizations
- [ ] Verify historical ratings preserved in evaluations
