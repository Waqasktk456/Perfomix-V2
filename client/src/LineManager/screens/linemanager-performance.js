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
import { getPerformanceRating } from '../../services/performanceRatingService';
import "./linemanager-performance.css";

const LineManagerDashboard = () => {
  const [evaluationId, setEvaluationId] = useState(null);
  const [trendline, setTrendline] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [parametersData, setParametersData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [performance, setPerformance] = useState({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all cycles first
    const fetchCycles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get('http://localhost:5000/api/cycles', config);
        const cyclesData = Array.isArray(response.data) ? response.data : [];
        
        console.log('Fetched cycles:', cyclesData);
        setCycles(cyclesData);
        
        // Automatically select the most recent cycle (first in the list)
        if (cyclesData.length > 0 && !selectedCycleId) {
          setSelectedCycleId(cyclesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching cycles:', error);
        toast.error('Failed to fetch evaluation cycles');
      }
    };

    fetchCycles();
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;

    const fetchEvaluations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // First, get the employee ID from the token
        const userId = localStorage.getItem('userId');
        
        // Fetch the line manager's evaluation using the same endpoint as admin
        const response = await axios.get(
          `http://localhost:5000/api/evaluations/line-manager/${userId}/${selectedCycleId}`,
          config
        );

        console.log('Line Manager Evaluation Response:', response.data);

        if (response.data.success && response.data.evaluation) {
          const evalData = response.data.evaluation;
          
          // Map evaluation details to performance data format
          const mappedData = (evalData.details || []).map(detail => {
            const rawScore = detail.score || 0;
            const weight = detail.weightage || 0;
            const rating = detail.rating || 0;
            const weightedScore = ((weight / 100) * rawScore).toFixed(2);
            // For chart: Convert rating (1-5) to percentage (20-100)
            const percentageScore = rating > 0 ? (rating * 20) : 0;
            
            return {
              parameter: detail.parameter_name,
              weightage: weight,
              rating: rating,
              score: rawScore,
              weightedScore: parseFloat(weightedScore),
              percentageScore: percentageScore,
              feedback: detail.comments || '-',
              recommendations: evalData.recommendation || evalData.areas_for_improvement || '-'
            };
          });

          setParametersData(mappedData);
          
          // Set chart data with percentage scores
          setChartData(mappedData.map(item => ({
            parameter: item.parameter,
            score: item.score,
            rating: item.rating,
            weightage: item.weightage,
            weightedScore: item.weightedScore,
            percentageScore: item.percentageScore
          })));

          // Calculate total score from weighted scores
          const total = mappedData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0);
          console.log('Calculated total score:', total);
          setTotalScore(total); // Store as number, not string

          if (evalData.id) {
            setEvaluationId(evalData.id);
          }
        } else {
          console.log('No evaluation found for this cycle');
          toast.info('No evaluation found for the selected cycle');
          setParametersData([]);
          setChartData([]);
          setTotalScore(0);
          setEvaluationId(null);
        }
      } catch (error) {
        console.error('Error fetching LM own performance:', error);
        if (error.response?.status === 404) {
          toast.info('No evaluation found for the selected cycle');
        } else {
          toast.error('Failed to fetch performance data');
        }
        setParametersData([]);
        setChartData([]);
        setTotalScore(0);
      }
    };

    fetchEvaluations();
  }, [selectedCycleId]);

  // Fetch performance rating from database
  useEffect(() => {
    const fetchRating = async () => {
      if (totalScore > 0) {
        console.log('Fetching rating for score:', totalScore);
        const rating = await getPerformanceRating(totalScore);
        console.log('Fetched rating:', rating);
        setPerformance(rating);
      }
    };
    fetchRating();
  }, [totalScore]);

  // Best and worst parameter logic
  const bestParam = parametersData.reduce((best, curr) => {
    const currScore = Number(curr.weightedScore) || 0;
    const bestScore = best ? (Number(best.weightedScore) || 0) : -Infinity;
    return currScore > bestScore ? curr : best;
  }, null);

  const worstParam = parametersData.reduce((worst, curr) => {
    const currScore = Number(curr.weightedScore) || 0;
    const worstScore = worst ? (Number(worst.weightedScore) || 0) : Infinity;
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
                  {bestParam ? `${bestParam.parameter} (${bestParam.weightedScore})` : '-'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Needs Attention</span>
                <span className="metric-value">
                  {worstParam ? `${worstParam.parameter} (${worstParam.weightedScore})` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filter Header */}
      <div className="filters-container">
        <div className="toggle-buttons">
          {/* Cycle Dropdown */}
          <select 
            className="cycle-dropdown"
            value={selectedCycleId || ''}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            style={{ 
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginRight: '10px',
              fontSize: '14px',
              color: '#6b7280',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '250px'
            }}
          >
            <option value="">Select Evaluation Cycle</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name || cycle.cycle_name}
              </option>
            ))}
          </select>
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
              <th>Weight (%)</th>
              <th>Rating (1-5)</th>
              <th>Score</th>
              <th>Feedback</th>
              <th>Recommendations</th>
            </tr>
          </thead>
          <tbody>
            {parametersData.length > 0 ? parametersData.map((param, index) => (
              <tr key={index}>
                <td>{param.parameter}</td>
                <td>{param.weightage}%</td>
                <td>{param.rating}</td>
                <td>{param.weightedScore}</td>
                <td>{param.feedback}</td>
                <td>{param.recommendations}</td>
              </tr>
            )) : (
              <tr><td colSpan="6">No evaluation data found.</td></tr>
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
            <YAxis 
              domain={[0, 100]}
              label={{ 
                value: "Performance (%)", 
                angle: -90, 
                position: "insideLeft" 
              }} 
            />
            <Tooltip 
              formatter={(value, name, props) => {
                if (name === 'Performance (%)') {
                  const { score, weightage } = props.payload;
                  return [`${value}%`, `Score: ${score} / ${weightage} (${value}%)`];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Parameter: ${label}`}
            />
            <Legend />
            <Bar dataKey="percentageScore" fill="#003f88" barSize={40} name="Performance (%)">
              <LabelList 
                dataKey="percentageScore" 
                position="top" 
                fill="#003f88" 
                fontSize={14} 
                fontWeight="bold"
                formatter={(value) => `${value}%`}
              />
            </Bar>
            {trendline && (
              <Line
                type="monotone"
                dataKey="percentageScore"
                stroke="#ff7300"
                strokeWidth={2}
                dot={{ fill: "#ff7300" }}
                name="Trend"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>

  );
};

export default LineManagerDashboard;
