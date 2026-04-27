import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Checkbox } from "@mui/material";
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import axios from 'axios';
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import { getPerformanceRating } from '../../services/performanceRatingService';
import "./view-performance-report.css";
import "../Employees/Employees.css";

const ViewPerformanceReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const employee = location.state?.employee;
  const [trendline, setTrendline] = useState(true);
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
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
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(location.state?.cycleId || null);
  const [currentEvaluationId, setCurrentEvaluationId] = useState(employee?.evaluation_id || null);
  const [overallFeedback, setOverallFeedback] = useState(null);
  const [overallRecommendation, setOverallRecommendation] = useState(null);

  // Fetch non-draft cycles
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get('http://localhost:5000/api/cycles', config);
        const allCycles = Array.isArray(res.data) ? res.data : [];
        const nonDraft = allCycles.filter(c => c.status !== 'draft');
        setCycles(nonDraft);
        if (!selectedCycleId && nonDraft.length > 0) {
          setSelectedCycleId(nonDraft[0].id);
        }
      } catch (err) {
        console.error('Error fetching cycles:', err);
      }
    };
    fetchCycles();
  }, []);

  useEffect(() => {
    const fetchPerformance = async () => {
      const empId = employee?.id;
      if (!empId || !selectedCycleId) { setLoading(false); return; }
      // Reset state immediately on cycle change
      setPerformanceData([]);
      setStoredOverallScore(null);
      setOverallFeedback(null);
      setOverallRecommendation(null);
      setPerformance({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(
          `http://localhost:5000/api/evaluations/employee/${empId}/cycle/${selectedCycleId}`,
          config
        );
        if (res.data.success && Array.isArray(res.data.evaluations)) {
          const mapped = res.data.evaluations.map(ev => {
            const rawScore = Number(ev.score) || 0;
            const weight = Number(ev.weightage) || 0;
            const rating = Number(ev.rating) || 0;
            const weightedScore = ((weight / 100) * rawScore).toFixed(2);
            let percentageScore, displayRating = rating;
            if (rating > 0) { percentageScore = rating * 20; }
            else if (rawScore > 0) { displayRating = Math.round(rawScore / 20); percentageScore = rawScore; }
            else { displayRating = 0; percentageScore = 0; }
            return {
              parameter_id: ev.parameter_id,
              parameter_name: ev.parameter,
              parameter: ev.parameter,
              weightage: weight,
              rating: displayRating,
              score: rawScore,
              weightedScore: parseFloat(weightedScore),
              percentageScore,
              feedback: ev.feedback || '',
              recommendation: ev.recommendation || '',
              evaluation_status: ev.evaluation_status
            };
          });
          setPerformanceData(mapped);
          setStoredOverallScore(res.data.overall_score || null);
          setOverallFeedback(res.data.feedback || null);
          setOverallRecommendation(res.data.recommendation || null);
          if (res.data.evaluation_id) setCurrentEvaluationId(res.data.evaluation_id);
          if (res.data.cycle_id) setCycleId(res.data.cycle_id);
        } else {
          setPerformanceData([]);
          setStoredOverallScore(null);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
        setPerformanceData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, [employee, selectedCycleId]);

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

  // Fetch performance rating from database — reset when no data
  useEffect(() => {
    const fetchRating = async () => {
      if (totalScore > 0) {
        const rating = await getPerformanceRating(totalScore);
        setPerformance(rating);
      } else {
        setPerformance({ level: 'No Evaluation', color: '#9E9E9E', bg: '#F5F5F5' });
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
    const evalId = currentEvaluationId;
    if (!evalId) {
      toast.error("No completed evaluation found for the selected cycle");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`http://localhost:5000/api/reports/individual/${evalId}`, config);

      if (res.data.success) {
        toast.info(`Generating report for ${employee.name}...`);
        await generateProfessionalPDF(res.data, 'individual-assessment');
        toast.success("Report downloaded");
      } else {
        toast.error("Failed to fetch report data");
      }
    } catch (error) {
      console.error('Individual PDF Export Error:', error);
      toast.error("Failed to generate report");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="staff-dashboard-container">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="add-employee-btn"
        style={{ marginBottom: 16, minWidth: 'unset', width: 'auto', padding: '10px 20px' }}
      >
        ← Back
      </button>
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
        <select
          value={selectedCycleId || ''}
          onChange={e => setSelectedCycleId(e.target.value)}
          style={{
            minWidth: 'unset',
            width: 'auto',
            padding: '10px 36px 10px 14px',
            border: '1.5px solid #c7d7f0',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e3a5f',
            background: 'linear-gradient(135deg, #f0f6ff 0%, #e8f0fe 100%)',
            boxShadow: '0 2px 8px rgba(45,108,223,0.10)',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232d6cdf' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <option value="">Select Cycle</option>
          {cycles.map(c => (
            <option key={c.id} value={c.id}>{c.cycle_name || c.name}</option>
          ))}
        </select>
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginRight: '130px' }}>
          {/* Avatar with hover popup */}
          <div style={{ position: 'relative', flexShrink: 0 }}
            onMouseEnter={() => setShowAvatarPopup(true)}
            onMouseLeave={() => setShowAvatarPopup(false)}
          >
          {employee?.profile_image || employee?.profile ? (
            <img
              src={`http://localhost:5000${employee.profile_image || employee.profile}`}
              alt={employee.name}
              style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c7d7f0', flexShrink: 0, display: 'block', cursor: 'pointer' }}
            />
          ) : (
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
              background: '#2d6cdf', color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '700', fontSize: '16px',
              border: '2px solid #c7d7f0', cursor: 'pointer'
            }}>
              {(employee?.name || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* Hover popup */}
          {showAvatarPopup && (employee?.profile_image || employee?.profile) && (
            <div style={{
              position: 'absolute', bottom: '0', right: '54px',
              zIndex: 1000, background: '#fff', borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.22)', padding: '8px',
              border: '1.5px solid #c7d7f0'
            }}>
              <img
                src={`http://localhost:5000${employee.profile_image || employee.profile}`}
                alt={employee.name}
                style={{ width: '200px', height: '200px', borderRadius: '8px', objectFit: 'contain', display: 'block', background: '#f8fafc' }}
              />
              <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '13px', fontWeight: '700', color: '#1e3a5f' }}>
                {employee.name}
              </div>
            </div>
          )}
          </div>
          {/* Name + Email */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
            <span style={{ fontWeight: '900', fontSize: '16px', color: '#1e3a5f', lineHeight: '1.2' }}>
              {employee?.name || 'Employee'}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {employee?.email || ''}
            </span>
          </div>
        </div>
        <div className="export-container">
          <button
            className="staff-export-report-btn"
            style={{ whiteSpace: 'nowrap', minWidth: '120px', maxWidth: '130px', padding: '12px 10px', textAlign: 'center' }}
            onClick={exportToPDF}
          >
            Export Report
          </button>
        </div>
      </div>

      <table className="staff-parameters-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Weight (%)</th>
            <th>Rating (1-5)</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {performanceData.length === 0 ? (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>No completed evaluations found.</td></tr>
          ) : (
            performanceData.map((item, index) => (
              <tr key={index}>
                <td>{item.parameter_name}</td>
                <td>{item.weightage}%</td>
                <td>{item.rating}</td>
                <td>{item.weightedScore}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Feedback & Recommendations 2-column layout */}
      {performanceData.length > 0 && (
        <div className="feedback-recommendation-grid">
          <div className="feedback-rec-column">
            <div className="feedback-rec-header">Feedback</div>
            <div className="feedback-rec-row">
              <span className="feedback-rec-text">{overallFeedback || '-'}</span>
            </div>
          </div>
          <div className="feedback-rec-column">
            <div className="feedback-rec-header">Recommendations</div>
            <div className="feedback-rec-row">
              <span className="feedback-rec-text">{overallRecommendation || '-'}</span>
            </div>
          </div>
        </div>
      )}

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
