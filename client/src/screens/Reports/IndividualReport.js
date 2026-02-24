import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { FaFilePdf, FaArrowLeft, FaPrint, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import './reports.css'; // Ensure you have basic styles or add new ones

const IndividualReport = () => {
    const { evaluation_id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
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
    const performanceLevel = getPerformanceLevel(performance.overall_score);

    // Sort parameters to find strengths and weaknesses
    const sortedParams = [...performance.parameters].sort((a, b) => b.score - a.score);
    const topStrengths = sortedParams.slice(0, 2);
    const weakestArea = sortedParams[sortedParams.length - 1];

    const radarData = performance.parameters.map(p => ({
        subject: p.parameter_name,
        A: p.score,
        fullMark: 100,
    }));

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
                    <div className="header-left">
                        <h1 className="company-name">{cycle_details.organization}</h1>
                        <h2 className="report-title">Individual Performance Report</h2>
                        <p className="report-meta">Generated on: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="header-right">
                        <div className="cycle-badge">
                            <span className="cycle-label">Evaluation Cycle</span>
                            <span className="cycle-name">{cycle_details.name}</span>
                        </div>
                    </div>
                </header>

                <div className="report-body">
                    {/* Employee Information Section */}
                    <section className="info-grid">
                        <div className="info-card">
                            <h3 className="section-heading">Employee Information</h3>
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
                                <span className="label">Designation:</span>
                                <span className="value">{employee_details.role}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Line Manager:</span>
                                <span className="value">{performance.evaluator_name || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Performance Summary Box */}
                        <div className="summary-card" style={{ borderColor: performanceLevel.color }}>
                            <h3 className="section-heading">Performance Summary</h3>
                            <div className="score-display">
                                <div className="score-circle" style={{ color: performanceLevel.color, borderColor: performanceLevel.color }}>
                                    {Number(performance.overall_score).toFixed(1)}%
                                </div>
                                <div className="rating-badge" style={{ backgroundColor: performanceLevel.bg, color: performanceLevel.color }}>
                                    {performanceLevel.label}
                                </div>
                            </div>
                            <div className="summary-details">
                                <div className="detail-item">
                                    <span>Total Weighted Score:</span>
                                    <strong>{Number(performance.weighted_score).toFixed(2)}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Evaluation Date:</span>
                                    <strong>{performance.submitted_at ? new Date(performance.submitted_at).toLocaleDateString() : 'Pending'}</strong>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Performance Insights */}
                    <section className="insights-section">
                        <h3 className="section-heading">Performance Insights</h3>
                        <div className="insights-grid">
                            <div className="insight-box strength">
                                <h4><FaCheckCircle style={{ marginRight: '8px' }} /> Key Strengths</h4>
                                <ul>
                                    {topStrengths.map((p, i) => (
                                        <li key={i}>{p.parameter_name} ({p.score}%)</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="insight-box weakness">
                                <h4><FaExclamationCircle style={{ marginRight: '8px' }} /> Area for Improvement</h4>
                                <p style={{ margin: 0 }}>
                                    {weakestArea ?
                                        `${weakestArea.parameter_name} (${weakestArea.score}%) - Focus on improving this area to boost overall performance.` :
                                        'None identified.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Detailed Evaluation Table */}
                    <section className="detailed-evaluation">
                        <h3 className="section-heading">Detailed Parameter Evaluation</h3>
                        <table className="evaluation-table">
                            <thead>
                                <tr>
                                    <th>Parameter</th>
                                    <th>Weight</th>
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
                                            <span className="param-desc">{p.description}</span>
                                        </td>
                                        <td className="text-center">{p.weightage}%</td>
                                        <td className="text-center score-val">{p.score} / 100</td>
                                        <td className="progress-cell">
                                            <div className="progress-bar-bg">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{
                                                        width: `${p.score}%`,
                                                        backgroundColor: getPerformanceLevel(p.score).color
                                                    }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="text-center font-bold">
                                            {(p.score * p.weightage / 100).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="4" className="text-right"><strong>Total Weighted Score:</strong></td>
                                    <td className="text-center total-score">{Number(performance.weighted_score).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Charts & Comparison */}
                    <section className="visuals-section">
                        <div className="chart-container">
                            <h4>Competency Radar</h4>
                            <div style={{ height: 300, width: '100%' }}>
                                <ResponsiveContainer>
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                        <Radar name="Score" dataKey="A" stroke="#003f88" fill="#003f88" fillOpacity={0.5} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Historical Comparison */}
                        {performance.previous_score && (
                            <div className="comparison-card">
                                <h4>Historical Comparison</h4>
                                <div className="comparison-flex">
                                    <div className="comp-item">
                                        <span className="comp-label">Previous Cycle ({performance.previous_cycle})</span>
                                        <span className="comp-value">{Number(performance.previous_score).toFixed(2)}%</span>
                                    </div>
                                    <div className="comp-arrow">
                                        {performance.overall_score > performance.previous_score ? (
                                            <div className="trend-up"><MdTrendingUp /> +{(performance.overall_score - performance.previous_score).toFixed(1)}%</div>
                                        ) : (
                                            <div className="trend-down"><MdTrendingDown /> {(performance.overall_score - performance.previous_score).toFixed(1)}%</div>
                                        )}
                                    </div>
                                    <div className="comp-item current">
                                        <span className="comp-label">Current Cycle</span>
                                        <span className="comp-value">{Number(performance.overall_score).toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Manager Feedback */}
                    <section className="feedback-section">
                        <h3 className="section-heading">Manager Feedback & Recommendations</h3>
                        <div className="feedback-content">
                            <blockquote>
                                {performance.manager_remarks || "No specific comments provided by the line manager."}
                            </blockquote>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="report-footer">
                        <p>Confidential • Generated by Perfomix Evaluation System • Page 1 of 1</p>
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

                @media print {
                    .no-print { display: none !important; }
                    .report-viewer-container { padding: 0; background: white; }
                    .report-paper { box-shadow: none; padding: 0; margin: 0; width: 100%; min-height: auto; }
                    .report-footer { position: fixed; bottom: 10px; left: 0; width: 100%; border-top: none; }
                    .summary-card { break-inside: avoid; }
                    .info-grid { break-inside: avoid; }
                    .evaluation-table tr { break-inside: avoid; }
                    .chart-container { break-inside: avoid; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default IndividualReport;
