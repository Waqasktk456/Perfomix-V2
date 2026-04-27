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
  const [trendData, setTrendData] = useState([]);

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

          // Calculate total score - use overall_score from API if available
          const total = evalData.overall_score 
            ? parseFloat(evalData.overall_score) 
            : mappedData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0);
          setTotalScore(total);

          // Fetch rating color/category immediately
          if (total > 0) {
            const rating = await getPerformanceRating(total);
            setPerformance(rating);
          } else {
            setPerformance({ level: 'Not Rated', color: '#9E9E9E', bg: '#F5F5F5' });
          }

          if (evalData.evaluation_id || evalData.id) {
            setEvaluationId(evalData.evaluation_id || evalData.id);
          }
        } else {
          console.log('No evaluation found for this cycle');
          toast.info('No evaluation found for the selected cycle');
          setParametersData([]);
          setChartData([]);
          setTotalScore(0);
          setPerformance({ level: 'No Evaluation', color: '#9E9E9E', bg: '#F5F5F5' });
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
        const rating = await getPerformanceRating(totalScore);
        setPerformance(rating);
      }
    };
    fetchRating();
  }, [totalScore]);

  // Fetch performance trend across all cycles
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get('http://localhost:5000/api/staff/lm-evaluation-trend', config);
        if (response.data.success && Array.isArray(response.data.trend)) {
          setTrendData(response.data.trend.map(t => ({
            ...t,
            overall_score: parseFloat(t.overall_score) || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching performance trend:', error);
      }
    };
    fetchTrend();
  }, []);

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

      {/* Performance Trend Across Cycles */}
      {trendData.length > 0 && (
        <div className="chart-section">
          {(() => {
            const currentCycleIndex = trendData.findIndex(t => t.cycle_id === parseInt(selectedCycleId));
            const currentScore = currentCycleIndex >= 0 ? trendData[currentCycleIndex].overall_score : null;
            const previousScore = currentCycleIndex > 0 ? trendData[currentCycleIndex - 1].overall_score : null;
            const performanceChange = currentScore && previousScore ? (currentScore - previousScore).toFixed(1) : null;
            const averageScore = (trendData.reduce((sum, t) => sum + t.overall_score, 0) / trendData.length).toFixed(1);

            return (
              <>
                <div className="trend-header">
                  <h3 className="section-title">Performance Trend Across Cycles</h3>
                  <p className="trend-subtitle">Across {trendData.length} Evaluation Cycle{trendData.length > 1 ? 's' : ''}</p>
                </div>

                {performanceChange !== null && (
                  <div className={`performance-insight ${parseFloat(performanceChange) > 0 ? 'positive' : parseFloat(performanceChange) < 0 ? 'negative' : 'neutral'}`}>
                    {parseFloat(performanceChange) > 0 ? (
                      <><span className="insight-icon">▲</span><span className="insight-text">Your performance improved by {Math.abs(performanceChange)}% compared to the previous cycle.</span></>
                    ) : parseFloat(performanceChange) < 0 ? (
                      <><span className="insight-icon">▼</span><span className="insight-text">Your performance declined by {Math.abs(performanceChange)}% compared to the previous cycle.</span></>
                    ) : (
                      <span className="insight-text">Your performance remained stable compared to the previous cycle.</span>
                    )}
                  </div>
                )}

                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={trendData} margin={{ top: 60, right: 40, left: 60, bottom: 20 }}>
                    <XAxis dataKey="cycle_name" tick={{ fontSize: 13, fontWeight: 500 }} />
                    <YAxis
                      domain={[0, 100]}
                      label={{ value: "Overall Performance (%)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 14, fontWeight: 600 } }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '2px solid #003f88', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      formatter={(value, name, props) => {
                        const rating = props.payload.rating_name || 'Not Rated';
                        return [`${value}% - ${rating}`, 'Performance'];
                      }}
                      labelFormatter={(label) => `Cycle: ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
                    <Line type="monotone" dataKey={() => parseFloat(averageScore)} stroke="#9E9E9E" strokeWidth={2} strokeDasharray="5 5" dot={false} name={`Average: ${averageScore}%`} />
                    <Line
                      type="monotone"
                      dataKey="overall_score"
                      stroke="#003f88"
                      strokeWidth={4}
                      dot={{ fill: "#003f88", strokeWidth: 3, r: 8, stroke: "#fff" }}
                      activeDot={{ r: 10, strokeWidth: 3, stroke: "#fff" }}
                      name="Overall Performance"
                    >
                      <LabelList
                        dataKey="overall_score"
                        position="top"
                        content={(props) => {
                          const { x, y, value, index } = props;
                          const rating = trendData[index]?.rating_name || '';
                          const xOffset = index === 0 ? 40 : 0;
                          const yOffset = index === trendData.length - 1 ? -10 : 0;
                          return (
                            <g>
                              <text x={x + xOffset} y={y - 20 + yOffset} fill="#003f88" fontSize={13} fontWeight="bold" textAnchor="middle">{value}%</text>
                              <text x={x + xOffset} y={y - 5 + yOffset} fill="#666" fontSize={11} textAnchor="middle">{rating}</text>
                            </g>
                          );
                        }}
                      />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            );
          })()}
        </div>
      )}

    </div>

  );
};

export default LineManagerDashboard;
