import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import axios from 'axios';
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import "./view-performance-report.css";

const ViewPerformanceReport = () => {
  const location = useLocation();
  const employee = location.state?.employee;
  const [trendline, setTrendline] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParamIndex, setSelectedParamIndex] = useState(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (employee?.id) {
        try {
          const token = localStorage.getItem('token');
          const config = {
            headers: { Authorization: `Bearer ${token}` }
          };

          const res = await axios.get(`http://localhost:5000/api/evaluations/completed/${employee.id}`, config);

          if (res.data.success && Array.isArray(res.data.evaluations)) {
            // Calculate weighted scores for each evaluation
            const evaluationsWithWeightedScores = res.data.evaluations.map(evaluation => ({
              ...evaluation,
              parameter_name: evaluation.parameter, // ensure consistent naming
              weightedScore: (((Number(evaluation.weightage) || 0) / 100) * (Number(evaluation.score) || 0)).toFixed(2)
            }));
            setPerformanceData(evaluationsWithWeightedScores);
          } else {
            setPerformanceData([]);
          }
        } catch (error) {
          console.error('Error fetching performance data:', error);
          setPerformanceData([]);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [employee]);

  // Calculate total score
  const totalScore = performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0)
    : 0;

  // Determine performance level and color
  const getPerformanceLevel = (score) => {
    if (score >= 90) return { level: "Excellent", color: "#4CAF50" };
    if (score >= 80) return { level: "Very Good", color: "#8BC34A" };
    if (score >= 70) return { level: "Good", color: "#FFC107" };
    if (score >= 60) return { level: "Satisfactory", color: "#FF9800" };
    return { level: "Needs Improvement", color: "#F44336" };
  };

  const performance = getPerformanceLevel(totalScore);

  // Find best parameter (highest weighted score)
  const bestParam = performanceData.length > 0 ? performanceData.reduce((best, curr) => {
    const currentScore = Number(curr.weightedScore) || 0;
    const bestScore = Number(best?.weightedScore) || 0;
    return currentScore > bestScore ? curr : best;
  }, performanceData[0]) : null;

  // Find worst parameter (lowest weighted score)
  const worstParam = performanceData.length > 0 ? performanceData.reduce((worst, curr) => {
    const currentScore = Number(curr.weightedScore) || 0;
    const worstScore = Number(worst?.weightedScore) || 0;
    return currentScore < worstScore ? curr : worst;
  }, performanceData[0]) : null;


  const exportToPDF = async () => {
    // We attempt to use the evaluation_id from the employee object
    const evalId = employee?.evaluation_id;
    if (!evalId) {
      toast.error("Evaluation record not found");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`http://localhost:5000/api/reports/individual/${evalId}`, config);

      if (res.data.success) {
        toast.info(`Generating professional assessment for ${employee.name}...`);
        await generateProfessionalPDF(res.data, 'individual-assessment');
        toast.success("Assessment report downloaded");
      }
    } catch (error) {
      console.error('Individual PDF Export Error:', error);
      toast.error("Failed to generate professional report");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="staff-dashboard-container">
      <div className="breadcrumb">
        <span>Performance Report</span> &gt;
        <span className="active"> View Performance </span>
      </div>

      {/* Total Score Display */}
      <div className="total-score-container">
        <div className="score-card">
          <div className="score-circle" style={{ borderColor: performance.color }}>
            <div className="score-value">{totalScore}</div>
            <div className="score-label">Overall Score</div>
          </div>
          <div className="performance-details">
            <h3 className="performance-level" style={{ color: performance.color }}>
              {performance.level}
            </h3>
            <div className="performance-metrics">
              <div className="metric">
                <span className="metric-label">Best Parameter</span>
                <span className="metric-value">
                  {bestParam ? `${bestParam.parameter_name} (${bestParam.weightedScore})` : '-'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Needs Attention</span>
                <span className="metric-value">
                  {worstParam ? `${worstParam.parameter_name} (${worstParam.weightedScore})` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="staff-filters-container">
        <select className="staff-filter-dropdown" defaultValue="Month">
          <option>Month</option>
        </select>
        <select className="staff-filter-dropdown" defaultValue="Year">
          <option>Year</option>
        </select>
        <h2 className="report-title" style={{ flexGrow: 1, textAlign: 'center', margin: 0 }}>{employee?.name || "Employee"}</h2>
        <div className="export-container">
          <button
            className="staff-export-report-btn"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            Export Report <FaChevronDown />
          </button>
          {showExportOptions && (
            <div className="export-options">
              <button onClick={exportToPDF}>Export as PDF</button>
            </div>
          )}
        </div>
      </div>

      <table className="staff-parameters-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Score</th>
            <th>Feedback</th>
            <th>Recommendations</th>
          </tr>
        </thead>
        <tbody>
          {performanceData.length === 0 ? (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>No completed evaluations found.</td></tr>
          ) : (
            performanceData.map((item, index) => (
              <tr key={index}>
                <td>{item.parameter_name}</td>
                <td>{item.weightedScore}</td>
                <td>{item.feedback || '-'}</td>
                <td>{item.recommendation || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="staff-chart-section">
        <Checkbox
          checked={trendline}
          onChange={() => setTrendline(!trendline)}
          color="primary"
        />
        <span>Add Trendline</span>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="parameter_name"
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              label={{
                value: "Score",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                style: { fontSize: 14 }
              }}
            />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="weightedScore" fill="#003f88" barSize={40} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="weightedScore" position="top" fill="#003f88" fontSize={12} fontWeight="bold" offset={10} />
            </Bar>
            {trendline && <Line type="monotone" dataKey="weightedScore" stroke="#ff7300" strokeWidth={2} dot={{ fill: "#ff7300", r: 4 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ViewPerformanceReport;
