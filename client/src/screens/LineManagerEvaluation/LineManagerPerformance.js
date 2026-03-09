import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import axios from 'axios';
import { toast } from 'react-toastify';
import { getPerformanceRating } from '../../services/performanceRatingService';
import "./LineManagerPerformance.css";

const LineManagerPerformance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [trendline, setTrendline] = useState(true);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);
  const [performance, setPerformance] = useState({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });

  const {
    lineManagerId,
    lineManagerName,
    lineManagerEmail,
    department,
    designation,
    cycleId,
    cycleName
  } = location.state || {};

  useEffect(() => {
    if (!lineManagerId || !cycleId) {
      toast.error("Missing line manager or cycle information");
      navigate('/line-manager-evaluation');
      return;
    }
    fetchLineManagerEvaluation();
  }, [lineManagerId, cycleId]);

  const fetchLineManagerEvaluation = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      console.log('Fetching evaluation for:', { lineManagerId, cycleId });

      const response = await axios.get(
        `http://localhost:5000/api/evaluations/line-manager/${lineManagerId}/${cycleId}`,
        config
      );

      console.log('Response:', response.data);

      if (response.data.success && response.data.evaluation) {
        const evalData = response.data.evaluation;
        console.log('Evaluation data:', evalData);
        setEvaluation(evalData);
        
        // Map evaluation details to performance data format
        const mappedData = (evalData.details || []).map(detail => {
          console.log('Detail:', detail);
          const rawScore = detail.score || 0;
          const weight = detail.weightage || 0;
          // Calculate weighted score: (weight / 100) * raw_score
          const weightedScore = ((weight / 100) * rawScore).toFixed(2);
          
          return {
            parameter_name: detail.parameter_name,
            weightage: weight,
            score: rawScore,
            weightedScore: parseFloat(weightedScore),
            feedback: detail.comments || '-',
            recommendation: evalData.recommendation || evalData.areas_for_improvement || '-'
          };
        });
        
        console.log('Mapped data:', mappedData);
        setPerformanceData(mappedData);
      } else {
        console.log('No evaluation found or error:', response.data);
        toast.info('No evaluation found for this line manager in this cycle');
      }
    } catch (error) {
      console.error('Error fetching line manager evaluation:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to fetch evaluation data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total score from weighted scores (sum of all weighted scores)
  const totalScore = performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0)
    : 0;

  // Fetch performance rating from database
  useEffect(() => {
    const fetchRating = async () => {
      if (totalScore > 0) {
        const rating = await getPerformanceRating(totalScore);
        setPerformance(rating);
      }
    };
    fetchRating();
  }, [totalScore]);

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
    toast.info("PDF export functionality coming soon");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="staff-dashboard-container">
      <div className="breadcrumb">
        <span onClick={() => navigate('/line-manager-evaluation')} style={{ cursor: 'pointer' }}>
          Line Manager Evaluation
        </span> &gt;
        <span className="active"> View Performance </span>
      </div>

      {/* Total Score Display */}
      <div className="total-score-container">
        <div className="score-card">
          <div className="score-circle" style={{ borderColor: performance.color }}>
            <div className="score-value">{Number(totalScore).toFixed(1)}</div>
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
        <h2 className="report-title" style={{ flexGrow: 1, textAlign: 'center', margin: 0 }}>
          {lineManagerName || "Line Manager"}
        </h2>
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
            <th>Weight</th>
            <th>Score</th>
            <th>Feedback</th>
            <th>Recommendations</th>
          </tr>
        </thead>
        <tbody>
          {performanceData.length === 0 ? (
            <tr><td colSpan="5" style={{ textAlign: 'center' }}>No evaluation data found.</td></tr>
          ) : (
            performanceData.map((item, index) => (
              <tr key={index}>
                <td>{item.parameter_name}</td>
                <td>{item.weightage || 0}</td>
                <td>{item.weightedScore}</td>
                <td>{item.feedback}</td>
                <td>{item.recommendation}</td>
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

export default LineManagerPerformance;
