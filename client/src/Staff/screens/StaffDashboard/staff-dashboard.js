import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import "./staff-dashboard.css";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
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
  const [performance, setPerformance] = useState({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [trendData, setTrendData] = useState([]);

  // Fetch all cycles
  useEffect(() => {
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

  // Fetch performance trend across all cycles
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get('http://localhost:5000/api/staff/my-evaluation-trend', config);
        
        if (response.data.success && Array.isArray(response.data.trend)) {
          console.log('Performance trend data:', response.data.trend);
          setTrendData(response.data.trend);
        }
      } catch (error) {
        console.error('Error fetching performance trend:', error);
      }
    };

    fetchTrend();
  }, []);

  // Fetch evaluation data when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;

    const fetchEvaluations = async () => {
      try {
        const employeeId = localStorage.getItem('userId');
        const token = localStorage.getItem('token'); // Get token
        if (!employeeId || !token) {
          console.log("No userId or token found");
          return;
        }

        // Send token in headers with cycleId as query param
        const res = await axios.get(
          `http://localhost:5000/api/staff/my-evaluation?cycleId=${selectedCycleId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.data.success && Array.isArray(res.data.parameters)) {
          console.log('=== Staff Dashboard Data ===');
          console.log('Full response:', res.data);
          console.log('Parameters:', res.data.parameters);
          const evaluations = res.data.parameters;

          const mapped = evaluations.map(ev => {
            const rawScore = ev.score || 0;
            const weight = ev.weightage || 0;
            const rating = ev.rating || 0;
            
            console.log('Parameter:', ev.parameter_name, '| Score:', rawScore, '| Weight:', weight, '| Rating:', rating);
            
            // Calculate weighted score (for table display)
            const weightedScore = ((weight / 100) * rawScore).toFixed(2);
            
            // For chart: Convert rating (1-5) to percentage (20-100)
            const percentageScore = rating > 0 ? (rating * 20) : 0;
            
            return {
              parameter: ev.parameter_name,
              weightage: weight,
              rating: rating,
              score: rawScore,
              weightedScore: parseFloat(weightedScore),
              percentageScore: percentageScore, // 0-100 based on rating
              feedback: ev.feedback || ev.comments || "",
              recommendation: ""
            };
          });

          console.log('Chart will use percentageScore values:', mapped.map(m => ({ param: m.parameter, percent: m.percentageScore })));
          setParametersData(mapped);

          const weightedScores = mapped.map(e => e.weightedScore);
          const total = weightedScores.reduce((acc, curr) => acc + curr, 0);
          setTotalScore(total.toFixed(2));

          setChartData(mapped.map(e => ({
            parameter: e.parameter,
            score: Number(e.score),
            weightage: e.weightage,
            weightedScore: e.weightedScore,
            percentageScore: e.percentageScore // Use percentage for chart
          })));

          if (res.data.evaluation_id) {
            setEvaluationId(res.data.evaluation_id);
          }

          // Use rating from API response instead of calculating on frontend
          if (res.data.rating && res.data.rating.name) {
            setPerformance({
              level: res.data.rating.name,
              color: res.data.rating.color || '#9E9E9E',
              bg: res.data.rating.bg_color || '#F5F5F5'
            });
          } else {
            // Fallback if no rating assigned yet
            setPerformance({ level: 'Not Rated', color: '#9E9E9E', bg: '#F5F5F5' });
          }
        } else {
          setParametersData([]);
          setChartData([]);
          setPerformance({ level: 'No Evaluation', color: '#9E9E9E', bg: '#F5F5F5' });
          toast.info('No completed evaluation found for this cycle');
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
  }, [selectedCycleId]);

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
      {/* Cycle Selection at Top */}
      <div className="cycle-selection-container">
        <label htmlFor="cycle-select" className="cycle-label">
          Evaluation Cycle:
        </label>
        <select 
          id="cycle-select"
          className="cycle-dropdown"
          value={selectedCycleId || ''}
          onChange={(e) => setSelectedCycleId(e.target.value)}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name || cycle.cycle_name}
            </option>
          ))}
        </select>
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
            <th>Weight (%)</th>
            <th>Rating (1-5)</th>
            <th>Score</th>
            <th>Feedback</th>
            <th>Recommendations</th>
          </tr>
        </thead>
        <tbody>
          {parametersData.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No completed evaluations found.</td></tr>
          ) : (
            parametersData.map((param, index) => (
              <tr key={index}>
                <td>{param.parameter}</td>
                <td>{param.weightage}%</td>
                <td>{param.rating}</td>
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
                value: "Performance (%)",
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
              formatter={(value, name, props) => {
                if (name === 'percentageScore') {
                  const { score, weightage } = props.payload;
                  return [
                    `${value}%`,
                    `Performance: ${score} / ${weightage} (${value}%)`
                  ];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Parameter: ${label}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => value === 'percentageScore' ? 'Performance (%)' : value}
            />
            <Bar
              dataKey="percentageScore"
              fill="#003f88"
              barSize={40}
              radius={[4, 4, 0, 0]}
              name="Performance (%)"
            >
              <LabelList
                dataKey="percentageScore"
                position="top"
                fill="#003f88"
                fontSize={12}
                fontWeight="bold"
                offset={10}
                formatter={(value) => `${value}%`}
              />
            </Bar>
            {trendline && (
              <Line
                type="monotone"
                dataKey="percentageScore"
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
                name="Trend"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Trend Across Cycles */}
      {trendData.length > 0 && (
        <div className="staff-chart-section">
          {/* Calculate insights */}
          {(() => {
            const currentCycleIndex = trendData.findIndex(t => t.cycle_id === selectedCycleId);
            const currentScore = currentCycleIndex >= 0 ? trendData[currentCycleIndex].overall_score : null;
            const previousScore = currentCycleIndex > 0 ? trendData[currentCycleIndex - 1].overall_score : null;
            const performanceChange = currentScore && previousScore ? (currentScore - previousScore).toFixed(1) : null;
            const averageScore = (trendData.reduce((sum, t) => sum + t.overall_score, 0) / trendData.length).toFixed(1);
            
            return (
              <>
                {/* Header with cycle count */}
                <div className="trend-header">
                  <h3 className="section-title">Performance Trend Across Cycles</h3>
                  <p className="trend-subtitle">Across {trendData.length} Evaluation Cycle{trendData.length > 1 ? 's' : ''}</p>
                </div>

                {/* Performance Change Indicator */}
                {performanceChange !== null && (
                  <div className={`performance-insight ${parseFloat(performanceChange) > 0 ? 'positive' : parseFloat(performanceChange) < 0 ? 'negative' : 'neutral'}`}>
                    {parseFloat(performanceChange) > 0 ? (
                      <>
                        <span className="insight-icon">▲</span>
                        <span className="insight-text">
                          Your performance improved by {Math.abs(performanceChange)}% compared to the previous cycle.
                        </span>
                      </>
                    ) : parseFloat(performanceChange) < 0 ? (
                      <>
                        <span className="insight-icon">▼</span>
                        <span className="insight-text">
                          Your performance declined by {Math.abs(performanceChange)}% compared to the previous cycle.
                        </span>
                      </>
                    ) : (
                      <span className="insight-text">
                        Your performance remained stable compared to the previous cycle.
                      </span>
                    )}
                  </div>
                )}

                {/* Chart */}
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 60, right: 40, left: 60, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="cycle_name"
                      tick={{ fontSize: 13, fontWeight: 500 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      label={{
                        value: "Overall Performance (%)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 0,
                        style: { fontSize: 14, fontWeight: 600 }
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #003f88',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      formatter={(value, name, props) => {
                        const rating = props.payload.rating_name || 'Not Rated';
                        return [`${value}% - ${rating}`, 'Performance'];
                      }}
                      labelFormatter={(label) => `Cycle: ${label}`}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ paddingBottom: '10px' }}
                    />
                    
                    {/* Average Performance Reference Line */}
                    <Line
                      type="monotone"
                      dataKey={() => parseFloat(averageScore)}
                      stroke="#9E9E9E"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name={`Average: ${averageScore}%`}
                    />
                    
                    {/* Main Performance Line */}
                    <Line
                      type="monotone"
                      dataKey="overall_score"
                      stroke="#003f88"
                      strokeWidth={4}
                      dot={{
                        fill: "#003f88",
                        strokeWidth: 3,
                        r: 8,
                        stroke: "#fff"
                      }}
                      activeDot={{
                        r: 10,
                        strokeWidth: 3,
                        stroke: "#fff"
                      }}
                      name="Overall Performance"
                    >
                      <LabelList
                        dataKey="overall_score"
                        position="top"
                        content={(props) => {
                          const { x, y, value, index } = props;
                          const rating = trendData[index]?.rating_name || '';
                          const isFirst = index === 0;
                          const isLast = index === trendData.length - 1;
                          
                          // Add offset for first label to avoid Y-axis overlap
                          const xOffset = isFirst ? 40 : 0;
                          // Shift last label upward
                          const yOffset = isLast ? -10 : 0;
                          
                          return (
                            <g>
                              <text
                                x={x + xOffset}
                                y={y - 20 + yOffset}
                                fill="#003f88"
                                fontSize={13}
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {value}%
                              </text>
                              <text
                                x={x + xOffset}
                                y={y - 5 + yOffset}
                                fill="#666"
                                fontSize={11}
                                textAnchor="middle"
                              >
                                {rating}
                              </text>
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

export default StaffDashboard;