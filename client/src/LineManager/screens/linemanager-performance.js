import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import "./linemanager-performance.css";
import { Checkbox } from "@mui/material";
import {
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import axios from "axios";
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import "./linemanager-performance.css";

const LineManagerDashboard = () => {
  const [evaluationId, setEvaluationId] = useState(null);
  const [trendline, setTrendline] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [parametersData, setParametersData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get('http://localhost:5000/api/staff/my-evaluation', config);

        if (res.data.success && Array.isArray(res.data.parameters)) {
          setParametersData(res.data.parameters.map(ev => ({
            parameter: ev.parameter_name,
            score: ev.score,
            feedback: ev.feedback,
            recommendations: ev.recommendation || "",
            weightage: ev.weightage
          })));
          setChartData(res.data.parameters.map(ev => ({
            parameter: ev.parameter_name,
            score: Number(ev.score)
          })));

          const weightedScores = res.data.parameters.map(e => ((Number(e.weightage) / 100) * Number(e.score)));
          const total = weightedScores.reduce((acc, curr) => acc + curr, 0);
          setTotalScore(total.toFixed(2));

          if (res.data.evaluation_id) {
            setEvaluationId(res.data.evaluation_id);
          }
        }
      } catch (error) {
        console.error('Error fetching LM own performance:', error);
        toast.error('Failed to fetch performance data');
      }
    };

    fetchEvaluations();
  }, []);

  // Performance level logic (same as staff dashboard)
  const getPerformanceLevel = (score) => {
    if (score >= 90) return { level: "Excellent", color: "#4CAF50" };
    if (score >= 80) return { level: "Very Good", color: "#8BC34A" };
    if (score >= 70) return { level: "Good", color: "#FFC107" };
    if (score >= 60) return { level: "Satisfactory", color: "#FF9800" };
    return { level: "Needs Improvement", color: "#F44336" };
  };
  const performance = getPerformanceLevel(Number(totalScore));

  // Best and worst parameter logic
  const bestParam = parametersData.reduce((best, curr) => {
    const currScore = ((Number(curr.weightage) / 100) * Number(curr.score));
    const bestScore = best ? ((Number(best.weightage) / 100) * Number(best.score)) : -Infinity;
    return currScore > bestScore ? curr : best;
  }, null);

  const worstParam = parametersData.reduce((worst, curr) => {
    const currScore = ((Number(curr.weightage) / 100) * Number(curr.score));
    const worstScore = worst ? ((Number(worst.weightage) / 100) * Number(worst.score)) : Infinity;
    return currScore < worstScore ? curr : worst;
  }, null);

  const handleExportPDF = async () => {
    if (!evaluationId) {
      toast.error("Evaluation record not found");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`http://localhost:5000/api/reports/individual/${evaluationId}`, config);

      if (res.data.success) {
        toast.info("Generating professional performance report...");
        await generateProfessionalPDF(res.data, 'individual-assessment');
        toast.success("Report downloaded successfully");
      }
    } catch (error) {
      console.error('Individual PDF Export Error:', error);
      toast.error("Failed to generate professional report");
    }
  };

  const handleEvaluate = () => {
    alert("Evaluation initiated.");
  };

  return (
    <div className="dashboard-container">
      {/* Top Score Card */}
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
                  {bestParam ? `${bestParam.parameter} (${((Number(bestParam.weightage) / 100) * Number(bestParam.score)).toFixed(2)})` : '-'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Needs Attention</span>
                <span className="metric-value">
                  {worstParam ? `${worstParam.parameter} (${((Number(worstParam.weightage) / 100) * Number(worstParam.score)).toFixed(2)})` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filter Header */}
      <div className="filters-container">
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${selectedPeriod === "Monthly" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("Monthly")}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${selectedPeriod === "Yearly" ? "active" : ""}`}
            onClick={() => setSelectedPeriod("Yearly")}
          >
            Yearly
          </button>
        </div>
        <button className="export-report-btn" onClick={handleExportPDF}>Export Report</button>
      </div>
      {/* Parameter Score Table */}
      <div className="parameters-wrapper">
        <h3 className="section-title">Parameter-wise Score</h3>
        <table className="parameters-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Score</th>
              <th>Feedback</th>
              <th>Recommendations</th>
            </tr>
          </thead>
          <tbody>
            {parametersData.length > 0 ? parametersData.map((param, index) => (
              <tr key={index}>
                <td>{param.parameter}</td>
                <td>{((Number(param.weightage) / 100) * Number(param.score)).toFixed(2)}</td>
                <td>{param.feedback}</td>
                <td>{param.recommendations}</td>
              </tr>
            )) : (
              <tr><td colSpan="4">No evaluation data found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Chart Section */}
      <div className="chart-section">
        <div className="chart-header">
          <Checkbox
            checked={trendline}
            onChange={() => setTrendline(!trendline)}
            color="primary"
          />
          <span className="trendline-label">Add Trendline</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="parameter" />
            <YAxis label={{ value: "Score in Percentage(%)", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" fill="#003f88" barSize={40}>
              <LabelList dataKey="score" position="top" fill="#003f88" fontSize={14} fontWeight="bold" />
            </Bar>
            {trendline && (
              <Line
                type="monotone"
                dataKey="score"
                stroke="#ff7300"
                strokeWidth={2}
                dot={{ fill: "#ff7300" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>

  );
};

export default LineManagerDashboard;
