import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import axios from 'axios';
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import { getPerformanceRating } from '../../services/performanceRatingService';
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
  const [performance, setPerformance] = useState({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });
  const [storedOverallScore, setStoredOverallScore] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [cycleId, setCycleId] = useState(location.state?.cycleId || null);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (employee?.evaluation_id) {
        try {
          const token = localStorage.getItem('token');
          const config = {
            headers: { Authorization: `Bearer ${token}` }
          };

          // Use evaluation_id directly instead of fetching by employee_id
          const res = await axios.get(`http://localhost:5000/api/evaluations/by-id/${employee.evaluation_id}`, config);

          console.log('=== Admin View Performance Data ===');
          console.log('Full response:', res.data);
          console.log('Evaluations array:', res.data.evaluations);
          
          if (res.data.evaluations && res.data.evaluations.length > 0) {
            console.log('First evaluation item:', JSON.stringify(res.data.evaluations[0], null, 2));
            console.log('All ratings from backend:', res.data.evaluations.map(e => ({ 
              param: e.parameter, 
              rating: e.rating, 
              score: e.score 
            })));
          }

          if (res.data.success && Array.isArray(res.data.evaluations)) {
            const evaluations = res.data.evaluations;

            // Map data similar to staff dashboard
            const mapped = evaluations.map(ev => {
              const rawScore = Number(ev.score) || 0;
              const weight = Number(ev.weightage) || 0;
              const rating = Number(ev.rating) || 0;
              
              console.log('Processing parameter:', ev.parameter);
              console.log('  Raw values from backend - rating:', ev.rating, 'score:', ev.score, 'weight:', ev.weightage);
              console.log('  Converted values - rating:', rating, 'score:', rawScore, 'weight:', weight);
              
              // Calculate weighted score (for table display)
              const weightedScore = ((weight / 100) * rawScore).toFixed(2);
              
              // For chart: Convert rating (1-5) to percentage (20-100)
              // If rating is 0 or null, calculate from score
              let percentageScore;
              let displayRating = rating;
              
              if (rating > 0) {
                percentageScore = rating * 20;
                console.log('  Using rating for chart:', rating, '→', percentageScore, '%');
              } else if (rawScore > 0) {
                // Calculate rating from score if rating is missing
                displayRating = Math.round(rawScore / 20);
                percentageScore = rawScore;
                console.log('  Calculated rating from score:', rawScore, '→ rating:', displayRating, '→', percentageScore, '%');
              } else {
                displayRating = 0;
                percentageScore = 0;
                console.log('  No rating or score available');
              }
              
              return {
                parameter_id: ev.parameter_id,
                parameter_name: ev.parameter,
                parameter: ev.parameter, // keep both for compatibility
                weightage: weight,
                rating: displayRating, // Use calculated rating if original is 0
                score: rawScore,
                weightedScore: parseFloat(weightedScore),
                percentageScore: percentageScore, // 0-100 based on rating or score
                feedback: ev.feedback || '',
                evaluation_status: ev.evaluation_status
              };
            });

            console.log('Final mapped data:', mapped.map(m => ({ 
              param: m.parameter, 
              rating: m.rating,
              score: m.score,
              percent: m.percentageScore 
            })));
            
            setPerformanceData(mapped);
            
            // Use stored overall_score if available, otherwise calculate
            if (res.data.overall_score) {
              setStoredOverallScore(res.data.overall_score);
            }

            // Set cycle_id if not already set
            if (res.data.cycle_id && !cycleId) {
              setCycleId(res.data.cycle_id);
            }
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
  }, [employee, cycleId]);

  // Fetch performance trend for this employee
  useEffect(() => {
    const fetchTrend = async () => {
      const employeeId = employee?.id;
      
      if (!employeeId) {
        console.log('Missing employeeId, cannot fetch trend');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const url = `http://localhost:5000/api/evaluations/trend/${employeeId}`;
        console.log('Fetching trend from:', url);
        
        const response = await axios.get(url, config);

        console.log('=== Trend Response ===', response.data);
        
        if (response.data.success && Array.isArray(response.data.trend)) {
          setTrendData(response.data.trend);
        } else {
          setTrendData([]);
        }
      } catch (error) {
        console.error('Error fetching trend:', error);
        setTrendData([]);
      }
    };

    fetchTrend();
  }, [employee]);

  // Fetch benchmark data
  useEffect(() => {
    console.log('=== Benchmark Fetch Check ===');
    console.log('Employee data:', employee);
    console.log('employee.id:', employee?.id);
    console.log('cycleId:', cycleId);
    
    const fetchBenchmark = async () => {
      // Use employee.id (which is Employee_id from the database)
      const employeeId = employee?.id;
      
      if (!employeeId || !cycleId) {
        console.log('Missing employeeId or cycleId, cannot fetch benchmark');
        console.log('employeeId:', employeeId, 'cycleId:', cycleId);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const url = `http://localhost:5000/api/evaluations/benchmark/${employeeId}/${cycleId}`;
        console.log('Fetching benchmark from:', url);
        
        const response = await axios.get(url, config);

        console.log('=== Benchmark Response ===', response.data);
        
        if (response.data.success) {
          setBenchmarkData(response.data);
        } else {
          setBenchmarkData(null);
        }
      } catch (error) {
        console.error('Error fetching benchmark:', error);
        console.error('Error response:', error.response?.data);
        setBenchmarkData(null);
      }
    };

    fetchBenchmark();
  }, [employee, cycleId]);

  // Use stored overall_score if available, otherwise calculate from weighted scores
  const totalScore = storedOverallScore || (performanceData.length > 0
    ? performanceData.reduce((acc, curr) => acc + (Number(curr.weightedScore) || 0), 0)
    : 0);

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
            <th>Weight (%)</th>
            <th>Rating (1-5)</th>
            <th>Score</th>
            <th>Feedback</th>
            <th>Recommendations</th>
          </tr>
        </thead>
        <tbody>
          {performanceData.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No completed evaluations found.</td></tr>
          ) : (
            performanceData.map((item, index) => (
              <tr key={index}>
                <td>{item.parameter_name}</td>
                <td>{item.weightage}%</td>
                <td>{item.rating}</td>
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
          <ComposedChart 
            data={performanceData} 
            margin={{ top: 20, right: 30, left: 60, bottom: 50 }}
          >
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
            const currentCycleIndex = trendData.findIndex(t => t.cycle_id === cycleId);
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
                          This employee's performance improved by {Math.abs(performanceChange)}% compared to the previous cycle.
                        </span>
                      </>
                    ) : parseFloat(performanceChange) < 0 ? (
                      <>
                        <span className="insight-icon">▼</span>
                        <span className="insight-text">
                          This employee's performance declined by {Math.abs(performanceChange)}% compared to the previous cycle.
                        </span>
                      </>
                    ) : (
                      <span className="insight-text">
                        This employee's performance remained stable compared to the previous cycle.
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
      
      {benchmarkData && benchmarkData.employeeScore !== null && (
        <div className="staff-chart-section">
          <div className="trend-header">
            <h3 className="section-title">Performance Benchmark Comparison</h3>
            <p className="trend-subtitle">How this employee compares with organizational benchmarks</p>
          </div>

          {/* Percentile Rank Badge */}
          {benchmarkData.percentileRank !== null && (
            <div className="percentile-badge">
              <div className="percentile-icon">🏆</div>
              <div className="percentile-text">
                This employee is performing better than <strong>{benchmarkData.percentileRank}%</strong> of employees in this cycle
              </div>
            </div>
          )}

          {/* Benchmark Insights */}
          {(() => {
            const insights = [];
            const { employeeScore, teamAverage, departmentAverage, companyAverage } = benchmarkData;

            if (teamAverage && employeeScore > teamAverage) {
              insights.push(`Performance is above the team average by ${(employeeScore - teamAverage).toFixed(1)}%`);
            } else if (teamAverage && employeeScore < teamAverage) {
              insights.push(`Performance is below the team average by ${(teamAverage - employeeScore).toFixed(1)}%`);
            }

            if (departmentAverage && employeeScore > departmentAverage) {
              insights.push(`Outperforms the department average by ${(employeeScore - departmentAverage).toFixed(1)}%`);
            } else if (departmentAverage && employeeScore < departmentAverage) {
              insights.push(`Performance is below the department average by ${(departmentAverage - employeeScore).toFixed(1)}%`);
            }

            if (companyAverage && employeeScore > companyAverage) {
              insights.push(`Exceeds the company benchmark by ${(employeeScore - companyAverage).toFixed(1)}%`);
            } else if (companyAverage && employeeScore < companyAverage) {
              insights.push(`Performance is below the company benchmark by ${(companyAverage - employeeScore).toFixed(1)}%`);
            }

            return insights.length > 0 && (
              <div className="benchmark-insights">
                {insights.map((insight, idx) => (
                  <div key={idx} className="benchmark-insight-item">
                    <span className="insight-bullet">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Horizontal Bar Chart */}
          <div className="benchmark-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                layout="vertical"
                data={[
                  { category: 'Employee Score', value: benchmarkData.employeeScore, fill: '#003f88' },
                  ...(benchmarkData.teamAverage ? [{ category: 'Team Average', value: benchmarkData.teamAverage, fill: '#4caf50' }] : []),
                  ...(benchmarkData.departmentAverage ? [{ category: 'Department Average', value: benchmarkData.departmentAverage, fill: '#ff9800' }] : []),
                  ...(benchmarkData.companyAverage ? [{ category: 'Company Average', value: benchmarkData.companyAverage, fill: '#9c27b0' }] : [])
                ]}
                margin={{ top: 20, right: 40, left: 150, bottom: 20 }}
              >
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="category" width={140} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Score']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #003f88',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {[
                    { category: 'Employee Score', value: benchmarkData.employeeScore, fill: '#003f88' },
                    ...(benchmarkData.teamAverage ? [{ category: 'Team Average', value: benchmarkData.teamAverage, fill: '#4caf50' }] : []),
                    ...(benchmarkData.departmentAverage ? [{ category: 'Department Average', value: benchmarkData.departmentAverage, fill: '#ff9800' }] : []),
                    ...(benchmarkData.companyAverage ? [{ category: 'Company Average', value: benchmarkData.companyAverage, fill: '#9c27b0' }] : [])
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(value) => `${value}%`}
                    style={{ fill: '#333', fontWeight: 'bold', fontSize: 14 }}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPerformanceReport;
