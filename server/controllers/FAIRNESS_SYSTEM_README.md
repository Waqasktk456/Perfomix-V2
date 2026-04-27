# Line Manager Fairness Evaluation System

## Overview
This is a **100% deterministic, rule-based fairness evaluation system** for line manager evaluations. It uses pure mathematical and statistical analysis to detect bias patterns - NO AI involved.

## Purpose
Detect and quantify bias in line manager evaluation patterns to ensure:
- Fair treatment of all employees
- Consistent evaluation standards
- Identification of problematic evaluation behaviors
- Data-driven insights for HR interventions

## How It Works

### Input Data
For each line manager evaluation, the system receives:
- `managerId`: Line manager identifier
- `role`: Line manager's role/designation
- `cycleId`: Evaluation cycle identifier
- `employees`: Array of evaluated employees, each containing:
  - `employeeId`: Employee identifier
  - `parameters`: Array of evaluation metrics with:
    - `name`: Parameter name (e.g., "Technical Skills")
    - `rating`: Score from 1-5
    - `weight`: Parameter importance (percentage)

### Analysis Steps

#### STEP 1: Basic Metrics Calculation
- **Average Rating**: Mean of all ratings across all employees
- **Variance (Standard Deviation)**: Measure of rating consistency
- **Rating Distribution**: Percentage breakdown of 1-5 star ratings

#### STEP 2: Bias Detection Rules

1. **Strictness/Leniency Bias**
   - `avg_rating < 2.5` → STRICT BIAS
   - `avg_rating > 4.2` → LENIENT BIAS
   - Otherwise → NORMAL RANGE

2. **Central Tendency Bias**
   - `>70% ratings are 3` → CENTRAL TENDENCY BIAS
   - Indicates manager avoids extreme ratings

3. **Inconsistency Score**
   - `std_dev > 1.2` → HIGH INCONSISTENCY
   - `0.6 ≤ std_dev ≤ 1.2` → MODERATE INCONSISTENCY
   - `std_dev < 0.6` → CONSISTENT EVALUATOR

4. **Outlier Detection**
   - Compare employee averages within same role
   - `max_avg - min_avg > 2.0` → HIGH EVALUATION SPREAD
   - Suggests potential favoritism or inconsistency

5. **Weight Ignorance Check**
   - Check if high-weight parameters (≥30%) are rated low (≤2)
   - `>40% employees affected` → IGNORES HIGH-IMPORTANCE PARAMETERS

#### STEP 3: Fairness Score Calculation
Weighted index (0-100) based on:
- **Consistency (30%)**: Penalty for high variance
- **Bias Neutrality (30%)**: Penalty for strict/lenient/central tendency bias
- **Distribution Balance (20%)**: Penalty for over-concentration or extreme spread
- **Weight Alignment (20%)**: Penalty for ignoring high-weight parameters

Score ranges:
- `90-100`: HIGHLY FAIR
- `70-89`: MOSTLY FAIR
- `50-69`: MODERATE BIAS RISK
- `<50`: HIGH BIAS RISK

#### STEP 4: Insight Generation
Rule-based summary explaining:
- Which bias flags were triggered
- Why they were triggered
- Specific patterns detected

Example: "Manager shows strict bias with low average rating and high variance across employee evaluations, indicating inconsistent judgment patterns."

## API Endpoints

### 1. Evaluate Single Manager
```
POST /api/fairness/evaluate
```

**Request Body:**
```json
{
  "managerId": "123",
  "role": "Senior Line Manager",
  "cycleId": "456",
  "employees": [
    {
      "employeeId": "789",
      "parameters": [
        { "name": "Technical Skills", "rating": 5, "weight": 40 },
        { "name": "Communication", "rating": 3, "weight": 15 }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "managerId": "123",
    "role": "Senior Line Manager",
    "cycleId": "456",
    "fairnessScore": 85,
    "fairnessLabel": "MOSTLY FAIR",
    "biasFlags": ["MODERATE INCONSISTENCY"],
    "consistencyLabel": "MODERATE INCONSISTENCY",
    "metrics": {
      "averageRating": 3.8,
      "variance": 0.9,
      "distribution": {
        "1": "5.0",
        "2": "10.0",
        "3": "30.0",
        "4": "35.0",
        "5": "20.0"
      },
      "totalEvaluations": 10,
      "totalRatings": 50
    },
    "insightSummary": "Manager demonstrates consistent and balanced evaluation patterns with no significant bias indicators detected."
  }
}
```

### 2. Get Cycle Fairness Report
```
GET /api/fairness/cycle/:cycleId
```

**Response:**
```json
{
  "success": true,
  "cycleId": "456",
  "totalManagers": 5,
  "managers": [
    {
      "managerId": "123",
      "managerName": "John Doe",
      "managerEmail": "john@example.com",
      "role": "Senior Line Manager",
      "fairnessScore": 85,
      "fairnessLabel": "MOSTLY FAIR",
      "biasFlags": [],
      "consistencyLabel": "CONSISTENT EVALUATOR",
      "metrics": { ... },
      "insightSummary": "..."
    }
  ]
}
```

## Frontend Integration

### Location
Admin Dashboard → Line Manager Evaluation → "View Fairness Report" button

### Features
- Cycle-wise filtering
- Visual fairness score badges
- Bias flag indicators
- Rating distribution charts
- Detailed metrics display
- Actionable insights

### Usage Flow
1. Admin selects evaluation cycle
2. Clicks "View Fairness Report"
3. System fetches all line manager evaluations for that cycle
4. Displays fairness analysis for each manager
5. Managers sorted by fairness score (lowest first to highlight issues)

## Key Principles

### 1. Deterministic
- Same input always produces same output
- No randomness or AI interpretation
- Fully reproducible results

### 2. Explainable
- Every score component is traceable
- Clear rules for each bias flag
- Human-readable insights

### 3. Transparent
- All thresholds are documented
- Calculation logic is visible
- No black-box decisions

### 4. Actionable
- Specific bias patterns identified
- Clear indicators for HR intervention
- Quantified fairness metrics

## Use Cases

### HR Administration
- Identify managers needing evaluation training
- Monitor evaluation quality across organization
- Ensure compliance with fair evaluation practices
- Generate reports for leadership

### Performance Management
- Validate evaluation consistency
- Detect systematic bias patterns
- Support calibration sessions
- Improve evaluation processes

### Compliance & Audit
- Document fair evaluation practices
- Provide evidence of bias detection
- Support legal compliance requirements
- Enable data-driven policy decisions

## Limitations

### What It Does NOT Do
- Does NOT evaluate employee performance
- Does NOT compute weighted scores
- Does NOT make hiring/firing decisions
- Does NOT replace human judgment

### What It DOES Do
- Detects statistical patterns in evaluation behavior
- Flags potential bias indicators
- Provides quantitative fairness metrics
- Supports data-driven HR decisions

## Future Enhancements
- Historical trend analysis
- Cross-cycle comparison
- Department-level aggregation
- Custom threshold configuration
- Export to PDF/Excel
- Email alerts for high-risk patterns

## Technical Notes

### Performance
- Efficient O(n) complexity for most calculations
- Handles 100+ employees per manager
- Sub-second response times
- Minimal database queries

### Security
- Protected by authentication middleware
- Organization-scoped data access
- No PII in bias calculations
- Audit trail support

### Maintenance
- Pure JavaScript implementation
- No external ML dependencies
- Easy to test and validate
- Simple threshold adjustments
