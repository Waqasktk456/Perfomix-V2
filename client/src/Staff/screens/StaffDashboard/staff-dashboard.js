import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import "./staff-dashboard.css";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import axios from "axios";
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../../utils/pdfGenerator';

const StaffDashboard = () => {
  const [trendline, setTrendline] = useState(true);
  const [parametersData, setParametersData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [evaluationId, setEvaluationId] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const employeeId = localStorage.getItem('userId');
        const token = localStorage.getItem('token'); // Get token
        if (!employeeId || !token) {
          console.log("No userId or token found");
          return;
        }

        // Send token in headers
        const res = await axios.get(
          'http://localhost:5000/api/staff/my-evaluation',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.data.success && Array.isArray(res.data.parameters)) {
          console.log(res.data, 'this is form staff dahsbrd');
          const evaluations = res.data.parameters;

          const mapped = evaluations.map(ev => ({
            parameter: ev.parameter_name,
            score: ev.score || 0,
            feedback: ev.feedback || ev.comments || "",
            recommendation: "", // your DB doesn't have this
            weightage: ev.weightage || 0
          }));

          setParametersData(mapped);

          const weightedScores = mapped.map(e => ((Number(e.weightage) / 100) * Number(e.score)));
          const total = weightedScores.reduce((acc, curr) => acc + curr, 0);
          setTotalScore(total.toFixed(2));

          setChartData(mapped.map(e => ({
            parameter: e.parameter,
            score: Number(e.score),
            weightedScore: ((Number(e.weightage) / 100) * Number(e.score)).toFixed(2)
          })));

          if (res.data.evaluation_id) {
            setEvaluationId(res.data.evaluation_id);
          }
        } else {
          setParametersData([]);
          setChartData([]);
        }
      } catch (err) {
        console.error("Error fetching evaluations:", err);
        if (err.response?.status === 401) {
          console.log("Unauthorized - token missing or invalid");
        }
        setParametersData([]);
        setChartData([]);
      }
    };

    fetchEvaluations();
  }, []);

  // Determine performance level and color
  const getPerformanceLevel = (score) => {
    if (score >= 90) return { level: "Excellent", color: "#4CAF50" };
    if (score >= 80) return { level: "Very Good", color: "#8BC34A" };
    if (score >= 70) return { level: "Good", color: "#FFC107" };
    if (score >= 60) return { level: "Satisfactory", color: "#FF9800" };
    return { level: "Needs Improvement", color: "#F44336" };
  };

  const performance = getPerformanceLevel(totalScore);

  // Find best and worst parameter
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

  const exportToCSV = () => {
    if (parametersData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Parameter", "Score", "Feedback", "Recommendation"];
    const rows = parametersData.map(p => [
      p.parameter,
      p.score,
      p.feedback,
      p.recommendation || "-"
    ]);
    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Performance_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="staff-dashboard-container">
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

      <div className="staff-filters-container">
        <select className="staff-filter-dropdown">
          <option>Month</option>
        </select>
        <select className="staff-filter-dropdown">
          <option>Year</option>
        </select>
        <div className="export-container">
          <button
            className="staff-export-report-btn"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            Export Report <FaChevronDown />
          </button>
          {showExportOptions && (
            <div className="export-options">
              <button onClick={handleExportPDF}>Export as PDF</button>
              <button onClick={exportToCSV}>Export as CSV</button>
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
          {parametersData.length === 0 ? (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>No completed evaluations found.</td></tr>
          ) : (
            parametersData.map((param, index) => (
              <tr key={index}>
                <td>{param.parameter}</td>
                <td>{((Number(param.weightage) / 100) * Number(param.score)).toFixed(2)}</td>
                <td>{param.feedback}</td>
                <td>{param.recommendation}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="staff-chart-section">
        <Checkbox checked={trendline} onChange={() => setTrendline(!trendline)} color="primary" />
        <span>Add Trendline</span>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 50 }}
          >
            <XAxis
              dataKey="parameter"
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
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '10px'
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
            />
            <Bar
              dataKey="weightedScore"
              fill="#003f88"
              barSize={40}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="weightedScore"
                position="top"
                fill="#003f88"
                fontSize={12}
                fontWeight="bold"
                offset={10}
              />
            </Bar>
            {trendline && (
              <Line
                type="monotone"
                dataKey="weightedScore"
                stroke="#ff7300"
                strokeWidth={2}
                dot={{
                  fill: "#ff7300",
                  strokeWidth: 2,
                  r: 4
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StaffDashboard;