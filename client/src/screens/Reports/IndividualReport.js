import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell
} from 'recharts';
import { FaFilePdf, FaArrowLeft, FaPrint, FaCheckCircle, FaExclamationCircle, FaLightbulb, FaStar } from 'react-icons/fa';
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { getPerformanceRating, getPerformanceRatings } from '../../services/performanceRatingService';
import './reports.css';

const IndividualReport = () => {
    const { evaluation_id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [performanceRating, setPerformanceRating] = useState({ level: 'Loading...', color: '#9E9E9E', bg: '#F5F5F5' });
    const [parameterColors, setParameterColors] = useState({});
    const [allRatings, setAllRatings] = useState([]);
    const reportRef = useRef();

    useEffect(() => {
        fetchReport();
    }, [evaluation_id]);

    const fetchReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:5000/api/reports/individual/${evaluation_id}`, config);
            setData(res.data);
            
            // Fetch all performance ratings for legend
            const ratings = await getPerformanceRatings();
            setAllRatings(ratings);
            
            // Fetch performance rating for overall score
            if (res.data?.overall_score) {
                const rating = await getPerformanceRating(res.data.overall_score);
                setPerformanceRating(rating);
            }
            
            // Fetch colors for each parameter score
            if (res.data?.performance?.parameters) {
                const colors = {};
                for (const param of res.data.performance.parameters) {
                    const rating = await getPerformanceRating(param.score);
                    colors[param.parameter_id] = rating.color;
                }
                setParameterColors(colors);
            }
        } catch (error) {
            console.error('Report fetch error:', error);
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceLevel = (score) => {
        const numScore = Number(score);
        if (numScore >= 85) return { label: 'Excellent', color: '#2e7d32', bg: '#e8f5e9' };
        if (numScore >= 70) return { label: 'Good', color: '#1976d2', bg: '#e3f2fd' };
        if (numScore >= 50) return { label: 'Satisfactory', color: '#f9a825', bg: '#fffde7' };
        return { label: 'Needs Improvement', color: '#d32f2f', bg: '#ffebee' };
    };

    const exportToPDF = async () => {
        const input = reportRef.current;
        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Performance_Report_${data?.employee_details?.name.replace(/\s+/g, '_')}.pdf`);
    };

    if (loading) return <div className="loading-container">Loading Report...</div>;
    if (!data) return <div className="error-container">Report not found.</div>;

    const { employee_details, cycle_details, performance } = data;
    const performanceLevel = performanceRating;

    // Sort parameters to find strengths and weaknesses
    const sortedParams = [...performance.parameters].sort((a, b) => b.score - a.score);
    const topStrengths = sortedParams.slice(0, 3); // Top 3 strengths
    const weakestAreas = sortedParams.slice(-2); // Bottom 2 areas

    // Prepare data for horizontal bar chart
    const barChartData = performance.parameters.map(p => ({
        name: p.parameter_name.length > 20 ? p.parameter_name.substring(0, 20) + '...' : p.parameter_name,
        score: p.score,
        color: parameterColors[p.parameter_id] || '#9E9E9E'
    }));

    const radarData = performance.parameters.map(p => ({
        subject: p.parameter_name.length > 15 ? p.parameter_name.substring(0, 15) + '...' : p.parameter_name,
        A: p.score,
        fullMark: 100,
    }));

    // Generate development recommendations based on weak parameters
    const developmentRecommendations = weakestAreas.map(param => {
        const recommendations = {
            'Communication': 'Attend communication skills workshops and practice active listening',
            'Leadership': 'Take on team lead responsibilities and complete leadership training',
            'Technical Skills': 'Enroll in relevant technical courses and certifications',
            'Problem Solving': 'Participate in problem-solving exercises and case studies',
            'Teamwork': 'Engage more in collaborative projects and team activities',
            'Time Management': 'Use productivity tools and attend time management seminars',
            'Innovation': 'Participate in brainstorming sessions and innovation challenges',
            'Quality': 'Focus on quality assurance practices and attention to detail'
        };
        
        // Find matching recommendation or provide generic one
        const matchedKey = Object.keys(recommendations).find(key => 
            param.parameter_name.toLowerCase().includes(key.toLowerCase())
        );
        
        return {
            parameter: param.parameter_name,
            recommendation: matchedKey ? recommendations[matchedKey] : `Focus on improving ${param.parameter_name} through targeted training and practice`
        };
    });

    return (
        <div className="report-viewer-container">
            {/* Action Bar (Hidden in Print/PDF) */}
            <div className="report-actions-bar no-print">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>
                <div className="action-buttons">
                    <button className="btn-action" onClick={() => window.print()}>
                        <FaPrint /> Print
                    </button>
                    <button className="btn-action btn-primary" onClick={exportToPDF}>
                        <FaFilePdf /> Download PDF
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="report-paper" ref={reportRef}>
                {/* Header */}
                <header className="report-header">
                    <div className="header-content">
                        <div className="header-left">
                            <h1 className="company-name">{cycle_details.organization}</h1>
                            <h2 className="report-title">Individual Performance Evaluation Report</h2>
                            <div className="report-meta-row">
                                <span className="meta-item">
                                    <strong>Evaluation Cycle:</strong> {cycle_details.name}
                                </span>
                                <span className="meta-divider">|</span>
                                <span className="meta-item">
                                    <strong>Report Generated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <div className="header-logo">
                            <div className="logo-placeholder">
                                <FaStar size={32} color="#003f88" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="report-body">
                    {/* Employee Information Section */}
                    <section className="info-grid">
                        <div className="info-card">
                            <h3 className="section-heading"><FaStar className="heading-icon" /> Employee Information</h3>
                            <div className="info-table">
                                <div className="info-row">
                                    <span className="label">Full Name:</span>
                                    <span className="value">{employee_details.name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Employee ID:</span>
                                    <span className="value">{employee_details.id || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Department:</span>
                                    <span className="value">{employee_details.department}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Team:</span>
                                    <span className="value">{employee_details.team || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Designation:</span>
                                    <span className="value">{employee_details.role}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Line Manager:</span>
                                    <span className="value">{performance.evaluator_name || 'N/A'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Evaluation Status:</span>
                                    <span className="value">
                                        <span className="status-badge status-completed">
                                            <FaCheckCircle /> Completed
                                        </span>
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Completion Date:</span>
                                    <span className="value">
                                        {performance.submitted_at ? new Date(performance.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Performance Summary Box */}
                        <div className="summary-card" style={{ borderColor: performanceLevel.color }}>
                            <h3 className="section-heading">Overall Performance Summary</h3>
                            <div className="score-display">
                                <div className="score-circle-large" style={{ color: performanceLevel.color, borderColor: performanceLevel.color }}>
                                    <div className="score-number">{Number(performance.overall_score).toFixed(1)}</div>
                                    <div className="score-max">/ 100</div>
                                </div>
                            </div>
                            <div className="rating-badge-large" style={{ backgroundColor: performanceLevel.bg, color: performanceLevel.color }}>
                                {performanceLevel.level}
                            </div>
                            <div className="score-progress-bar">
                                <div className="score-progress-fill" style={{ width: `${performance.overall_score}%`, backgroundColor: performanceLevel.color }}></div>
                            </div>
                            <div className="summary-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Weighted Score</span>
                                    <span className="stat-value">{Number(performance.weighted_score).toFixed(2)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Parameters Evaluated</span>
                                    <span className="stat-value">{performance.parameters.length}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Overall Performance Snapshot */}
                    <section className="performance-snapshot-section" style={{ margin: '40px 0', padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                        <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>
                            <FaStar className="heading-icon" style={{ color: '#f59e0b' }} /> Overall Performance Snapshot
                        </h3>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '40px', flexWrap: 'wrap' }}>
                            {/* Big Score Display */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '80px', 
                                    fontWeight: '900', 
                                    color: performanceLevel.color,
                                    lineHeight: '1',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    {Number(performance.overall_score).toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', fontWeight: '500' }}>
                                    Overall Performance Score
                                </div>
                            </div>

                            {/* Circular Gauge */}
                            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                                    {/* Background circle */}
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="85"
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="20"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="85"
                                        fill="none"
                                        stroke={performanceLevel.color}
                                        strokeWidth="20"
                                        strokeDasharray={`${(performance.overall_score / 100) * 534} 534`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 1s ease' }}
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: performanceLevel.color }}>
                                        {Number(performance.overall_score).toFixed(0)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        out of 100
                                    </div>
                                </div>
                            </div>

                            {/* Performance Rating Badge & Progress Bar */}
                            <div style={{ flex: '1', minWidth: '280px', maxWidth: '400px' }}>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '12px 32px',
                                    borderRadius: '50px',
                                    backgroundColor: performanceLevel.bg,
                                    color: performanceLevel.color,
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    marginBottom: '20px',
                                    boxShadow: `0 4px 12px ${performanceLevel.color}33`,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {performanceLevel.level}
                                </div>
                                
                                {/* Horizontal Progress Bar */}
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '24px',
                                        backgroundColor: '#e2e8f0',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{
                                            width: `${performance.overall_score}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${performanceLevel.color} 0%, ${performanceLevel.color}dd 100%)`,
                                            borderRadius: '12px',
                                            transition: 'width 1s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            paddingRight: '8px',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: '700'
                                        }}>
                                            {Number(performance.overall_score) > 15 && `${Number(performance.overall_score).toFixed(0)}%`}
                                        </div>
                                    </div>
                                    
                                    {/* Rating Legend */}
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                            <span style={{ color: '#64748b' }}>Excellent (≥80)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                                            <span style={{ color: '#64748b' }}>Average (70-79)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                            <span style={{ color: '#64748b' }}>Needs Improvement (&lt;70)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Performance Insights */}
                    <section className="insights-section">
                        <h3 className="section-heading"><FaLightbulb className="heading-icon" /> Performance Insights</h3>
                        <div className="insights-grid">
                            <div className="insight-box strength">
                                <h4><FaCheckCircle className="insight-icon" /> Key Strengths</h4>
                                <ul className="insight-list">
                                    {topStrengths.map((p, i) => (
                                        <li key={i}>
                                            <strong>{p.parameter_name}</strong>
                                            <span className="insight-score">{p.score}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="insight-box weakness">
                                <h4><FaExclamationCircle className="insight-icon" /> Areas for Improvement</h4>
                                <ul className="insight-list">
                                    {weakestAreas.map((p, i) => (
                                        <li key={i}>
                                            <strong>{p.parameter_name}</strong>
                                            <span className="insight-score">{p.score}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Performance Visualizations */}
                    <section className="visualizations-section">
                        <h3 className="section-heading">Performance Visualizations</h3>
                        <div className="charts-grid">
                            {/* Horizontal Bar Chart */}
                            <div className="chart-container">
                                <h4 className="chart-title">Parameter Performance Overview</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                                        <RechartsTooltip />
                                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                            {barChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Radar Chart */}
                            <div className="chart-container">
                                <h4 className="chart-title">Competency Radar</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e0e0e0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#666' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                        <Radar name="Score" dataKey="A" stroke="#003f88" fill="#003f88" fillOpacity={0.6} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* Detailed Evaluation Table */}
                    <section className="detailed-evaluation">
                        <h3 className="section-heading">Detailed Parameter Evaluation</h3>
                        <table className="evaluation-table">
                            <thead>
                                <tr>
                                    <th>Performance Parameter</th>
                                    <th>Weight (%)</th>
                                    <th>Score</th>
                                    <th>Progress</th>
                                    <th>Weighted Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.parameters.map((p, i) => (
                                    <tr key={i}>
                                        <td className="param-name">
                                            {p.parameter_name}
                                            {p.description && <span className="param-desc">{p.description}</span>}
                                        </td>
                                        <td className="text-center weight-cell">{p.weightage}%</td>
                                        <td className="text-center score-val">{p.score}</td>
                                        <td className="progress-cell">
                                            <div className="progress-bar-bg">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{
                                                        width: `${p.score}%`,
                                                        backgroundColor: parameterColors[p.parameter_id] || '#9E9E9E'
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="progress-label">{p.score}%</span>
                                        </td>
                                        <td className="text-center font-bold weighted-score-cell">
                                            {(p.score * p.weightage / 100).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="total-row">
                                    <td colSpan="4" className="text-right"><strong>Total Score:</strong></td>
                                    <td className="text-center total-score">{Number(performance.weighted_score).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Manager Feedback */}
                    <section className="feedback-section">
                        <h3 className="section-heading">Manager Feedback</h3>
                        <div className="feedback-content">
                            {performance.manager_remarks ? (
                                <blockquote className="feedback-quote">
                                    "{performance.manager_remarks}"
                                </blockquote>
                            ) : (
                                <p className="no-feedback">Manager feedback was not provided for this evaluation cycle.</p>
                            )}
                        </div>
                    </section>

                    {/* Development Recommendations */}
                    <section className="recommendations-section">
                        <h3 className="section-heading"><FaLightbulb className="heading-icon" /> Development Recommendations</h3>
                        <div className="recommendations-content">
                            <p className="recommendations-intro">Based on the evaluation results, the following development actions are recommended:</p>
                            <ul className="recommendations-list">
                                {developmentRecommendations.map((rec, i) => (
                                    <li key={i}>
                                        <strong>{rec.parameter}:</strong> {rec.recommendation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* Performance Rating Legend */}
                    <section className="legend-section">
                        <h3 className="section-heading">Performance Rating Legend</h3>
                        <table className="legend-table">
                            <thead>
                                <tr>
                                    <th>Score Range</th>
                                    <th>Rating</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRatings.length > 0 ? (
                                    allRatings.sort((a, b) => b.min_score - a.min_score).map((rating, i) => (
                                        <tr key={i}>
                                            <td className="text-center">{rating.min_score} - {rating.max_score}</td>
                                            <td>
                                                <span className="legend-badge" style={{ backgroundColor: rating.bg_color || rating.color, color: rating.color }}>
                                                    {rating.name}
                                                </span>
                                            </td>
                                            <td>{rating.description || `Performance is ${rating.name.toLowerCase()}`}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <>
                                        <tr>
                                            <td className="text-center">90 - 100</td>
                                            <td><span className="legend-badge" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}>Excellent</span></td>
                                            <td>Outstanding performance, exceeds all expectations</td>
                                        </tr>
                                        <tr>
                                            <td className="text-center">80 - 89</td>
                                            <td><span className="legend-badge" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>Very Good</span></td>
                                            <td>Consistently exceeds expectations</td>
                                        </tr>
                                        <tr>
                                            <td className="text-center">70 - 79</td>
                                            <td><span className="legend-badge" style={{ backgroundColor: '#e8eaf6', color: '#5e35b1' }}>Good</span></td>
                                            <td>Meets and sometimes exceeds expectations</td>
                                        </tr>
                                        <tr>
                                            <td className="text-center">60 - 69</td>
                                            <td><span className="legend-badge" style={{ backgroundColor: '#fffde7', color: '#f9a825' }}>Satisfactory</span></td>
                                            <td>Meets expectations consistently</td>
                                        </tr>
                                        <tr>
                                            <td className="text-center">Below 60</td>
                                            <td><span className="legend-badge" style={{ backgroundColor: '#ffebee', color: '#d32f2f' }}>Needs Improvement</span></td>
                                            <td>Performance below expectations, requires development</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </section>

                    {/* Footer */}
                    <footer className="report-footer">
                        <div className="footer-divider"></div>
                        <p className="footer-confidential">
                            <strong>CONFIDENTIAL:</strong> This report contains confidential employee performance information and is intended for internal organizational use only.
                        </p>
                        <p className="footer-meta">
                            Generated by {cycle_details.organization} Performance Management System • {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • Page 1 of 1
                        </p>
                    </footer>
                </div>
            </div>

            {/* Embedded CSS for this specific report */}
            <style jsx="true">{`
                .report-viewer-container {
                    padding: 20px;
                    background: #f0f2f5;
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                }
                .report-actions-bar {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .btn-back, .btn-action {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    background: white;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    transition: all 0.2s;
                }
                .btn-primary { background: #003f88; color: white; }
                
                .report-paper {
                    background: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm 20mm;
                    margin: 0 auto;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    position: relative;
                }
                
                .report-header {
                    border-bottom: 3px solid #003f88;
                    padding-bottom: 15px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .company-name { color: #003f88; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                .report-title { margin: 5px 0; font-size: 18px; color: #444; font-weight: 500; }
                .report-meta { margin: 0; color: #888; font-size: 11px; }
                .cycle-badge { text-align: right; }
                .cycle-label { display: block; font-size: 10px; text-transform: uppercase; color: #888; }
                .cycle-name { font-size: 16px; font-weight: 600; color: #333; }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }
                
                .section-heading {
                    font-size: 13px;
                    text-transform: uppercase;
                    color: #555;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 13px;
                    border-bottom: 1px dashed #f0f0f0;
                    padding-bottom: 4px;
                }
                .info-row:last-child { border-bottom: none; }
                .info-row .label { color: #666; font-weight: 500; }
                .info-row .value { color: #333; font-weight: 600; text-align: right; }

                .summary-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px;
                    border-top-width: 4px;
                    background-color: #fbfbfb;
                }
                .score-display {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 15px;
                    justify-content: center;
                }
                .score-circle {
                    font-size: 24px;
                    font-weight: 800;
                    border: 4px solid #ddd;
                    border-radius: 50%;
                    width: 70px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                }
                .rating-badge {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .summary-details .detail-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin-bottom: 5px;
                    color: #555;
                }

                .insights-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .insight-box {
                    padding: 15px;
                    border-radius: 8px;
                    font-size: 13px;
                    height: 100%;
                }
                .insight-box h4 { margin: 0 0 10px 0; display: flex; align-items: center; font-size: 14px; }
                .strength { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
                .weakness { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
                .insight-box ul { padding-left: 20px; margin: 0; }
                .insight-box li { margin-bottom: 4px; }

                .evaluation-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 30px;
                }
                .evaluation-table th {
                    background: #f8f9fa;
                    padding: 10px;
                    text-align: left;
                    border-bottom: 2px solid #ddd;
                    color: #444;
                    font-weight: 600;
                }
                .evaluation-table td {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    vertical-align: middle;
                }
                .param-name { font-weight: 600; width: 35%; color: #333; }
                .param-desc { display: block; font-size: 10px; color: #777; font-weight: 400; margin-top: 3px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                .score-val { width: 10%; font-weight: 600; }
                
                .progress-cell { width: 30%; padding-left: 15px; padding-right: 15px; }
                .progress-bar-bg { background: #eee; height: 6px; border-radius: 3px; overflow: hidden; width: 100%; }
                .progress-bar-fill { height: 100%; border-radius: 3px; }
                
                .total-score { font-size: 14px; color: #003f88; font-weight: 800; background: #f0f7ff; }

                .visuals-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                    align-items: center;
                }
                .chart-container {
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 8px;
                    background: #fff;
                }
                .chart-container h4 { text-align: center; margin: 0 0 10px 0; color: #666; font-size: 13px; text-transform: uppercase; }

                .comparison-card {
                    padding: 20px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border: 1px solid #eee;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .comparison-card h4 { text-align: center; margin: 0 0 20px 0; color: #666; font-size: 13px; text-transform: uppercase; }
                .comparison-flex {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                }
                .comp-item { display: flex; flex-direction: column; align-items: center; }
                .comp-label { font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
                .comp-value { font-size: 20px; font-weight: 700; color: #333; }
                .current .comp-value { color: #003f88; font-size: 24px; }
                .current .comp-label { color: #003f88; font-weight: 600; }
                .trend-up { color: #166534; font-weight: 600; display: flex; align-items: center; gap: 4px; font-size: 14px; background: #dcfce7; padding: 4px 8px; border-radius: 12px; }
                .trend-down { color: #991b1b; font-weight: 600; display: flex; align-items: center; gap: 4px; font-size: 14px; background: #fee2e2; padding: 4px 8px; border-radius: 12px; }

                .feedback-section { margin-bottom: 30px; }
                .feedback-content blockquote {
                    background: #fff;
                    border-left: 4px solid #003f88;
                    margin: 0;
                    padding: 15px 20px;
                    font-style: italic;
                    color: #555;
                    font-size: 13px;
                    line-height: 1.5;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    background-color: #f8f9fa;
                }

                .report-footer {
                    margin-top: 50px;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                    text-align: center;
                    font-size: 10px;
                    color: #aaa;
                    position: absolute;
                    bottom: 15mm;
                    width: calc(100% - 40mm);
                }

                /* Enhanced Header Styles */
                .header-content { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
                .report-meta-row { display: flex; gap: 10px; align-items: center; margin-top: 8px; font-size: 11px; color: #666; }
                .meta-item { display: flex; gap: 4px; }
                .meta-divider { color: #ccc; }
                .header-logo { display: flex; align-items: center; }
                .logo-placeholder { width: 60px; height: 60px; border: 2px solid #003f88; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; }

                /* Enhanced Info Section */
                .info-table { display: flex; flex-direction: column; gap: 2px; }
                .heading-icon { margin-right: 8px; font-size: 14px; }
                .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                .status-completed { background: #dcfce7; color: #166534; }

                /* Enhanced Summary Card */
                .score-circle-large { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px; border: 5px solid; border-radius: 50%; background: white; margin: 0 auto 15px; }
                .score-number { font-size: 32px; font-weight: 800; line-height: 1; }
                .score-max { font-size: 14px; color: #888; margin-top: 2px; }
                .rating-badge-large { text-align: center; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
                .score-progress-bar { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 15px; }
                .score-progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
                .summary-stats { display: flex; flex-direction: column; gap: 8px; }
                .stat-item { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px dashed #eee; }
                .stat-item:last-child { border-bottom: none; }
                .stat-label { color: #666; }
                .stat-value { font-weight: 700; color: #003f88; }

                /* Enhanced Insights */
                .insight-icon { margin-right: 6px; }
                .insight-list { list-style: none; padding: 0; margin: 0; }
                .insight-list li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.1); }
                .insight-list li:last-child { border-bottom: none; }
                .insight-score { font-weight: 700; font-size: 14px; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.5); }

                /* Visualizations Section */
                .visualizations-section { margin-bottom: 30px; }
                .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .chart-title { text-align: center; margin: 0 0 15px 0; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }

                /* Enhanced Table */
                .weight-cell { font-weight: 600; color: #666; }
                .weighted-score-cell { color: #003f88; font-size: 13px; }
                .progress-label { position: absolute; right: 5px; font-size: 10px; color: #666; font-weight: 600; }
                .progress-cell { position: relative; }
                .total-row { background: #f8f9fa; font-weight: 700; }

                /* Feedback Section */
                .feedback-quote { background: #f8f9fa; border-left: 4px solid #003f88; margin: 0; padding: 20px; font-style: italic; color: #555; font-size: 14px; line-height: 1.6; border-radius: 0 4px 4px 0; }
                .no-feedback { text-align: center; padding: 20px; color: #999; font-style: italic; background: #f8f9fa; border-radius: 4px; }

                /* Recommendations Section */
                .recommendations-section { margin-bottom: 30px; }
                .recommendations-intro { margin: 0 0 15px 0; color: #666; font-size: 13px; }
                .recommendations-list { padding-left: 20px; margin: 0; }
                .recommendations-list li { margin-bottom: 12px; line-height: 1.6; color: #555; font-size: 13px; }

                /* Legend Section */
                .legend-section { margin-bottom: 30px; }
                .legend-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .legend-table th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color: #444; font-weight: 600; }
                .legend-table td { padding: 10px; border-bottom: 1px solid #eee; }
                .legend-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }

                /* Enhanced Footer */
                .footer-divider { height: 2px; background: linear-gradient(to right, #003f88, transparent); margin-bottom: 15px; }
                .footer-confidential { margin: 0 0 8px 0; font-size: 11px; color: #d32f2f; text-align: center; }
                .footer-meta { margin: 0; font-size: 10px; color: #aaa; text-align: center; }

                @media print {
                    .no-print { display: none !important; }
                    .report-viewer-container { padding: 0; background: white; }
                    .report-paper { box-shadow: none; padding: 0; margin: 0; width: 100%; min-height: auto; }
                    .report-footer { position: fixed; bottom: 10px; left: 0; width: 100%; border-top: none; }
                    .summary-card { break-inside: avoid; }
                    .info-grid { break-inside: avoid; }
                    .evaluation-table tr { break-inside: avoid; }
                    .chart-container { break-inside: avoid; }
                    .visualizations-section { break-inside: avoid; }
                    .recommendations-section { break-inside: avoid; }
                    .legend-section { break-inside: avoid; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default IndividualReport;
