import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { FaFilePdf, FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import './reports.css';

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
            console.error('Individual report fetch error:', error);
            toast.error('Failed to load individual report');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = async () => {
        const element = reportRef.current;
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Performance_Report_${data?.employee_details?.name}_${data?.cycle_details?.name}.pdf`);
    };

    if (loading) return <div className="loading">Loading report...</div>;
    if (!data) return <div className="error">Report not found</div>;

    const { employee_details, cycle_details, performance } = data;

    // Prepare Radar Data
    const radarData = performance.parameters.map(p => ({
        subject: p.parameter_name,
        A: p.score,
        fullMark: 100,
    }));

    return (
        <div className="reports-container">
            <div className="reports-header no-print">
                <button className="btn-export" style={{ backgroundColor: '#666', color: 'white' }} onClick={() => navigate(-1)}>
                    <FaArrowLeft /> Back
                </button>
                <div className="export-buttons">
                    <button className="btn-export btn-pdf" onClick={exportToPDF}>
                        <FaFilePdf /> Export PDF
                    </button>
                </div>
            </div>

            <div ref={reportRef} className="report-content-wrapper" style={{ padding: '30px', backgroundColor: 'white' }}>
                {/* Header Section */}
                <div className="report-print-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #003f88', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ color: '#003f88', margin: '0 0 10px 0' }}>{cycle_details.organization}</h1>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#444' }}>Performance Evaluation Report</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 5px 0' }}><strong>Cycle:</strong> {cycle_details.name}</p>
                        <p style={{ margin: 0 }}><strong>Period:</strong> {new Date(cycle_details.start).toLocaleDateString()} - {new Date(cycle_details.end).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Employee Details & Summary Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Employee Details</h3>
                        <table style={{ width: '100%', fontSize: '14px' }}>
                            <tbody>
                                <tr><td style={{ padding: '5px 0', color: '#666' }}>Name:</td><td><strong>{employee_details.name}</strong></td></tr>
                                <tr><td style={{ padding: '5px 0', color: '#666' }}>Designation:</td><td>{employee_details.role}</td></tr>
                                <tr><td style={{ padding: '5px 0', color: '#666' }}>Department:</td><td>{employee_details.department}</td></tr>
                                <tr><td style={{ padding: '5px 0', color: '#666' }}>Team:</td><td>{employee_details.team}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#003f88', color: 'white', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ textAlignment: 'center' }}>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', textAlign: 'center' }}>{performance.overall_score || 0}</div>
                            <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, textAlign: 'center' }}>Overall Score</div>
                            <div style={{ marginTop: '10px', padding: '5px 15px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '12px', textAlign: 'center' }}>
                                STATUS: {performance.status?.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parameter Breakdown */}
                <h3 className="chart-title">Parameter-wise Evaluation</h3>
                <table className="report-table" style={{ marginBottom: '40px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f1f1' }}>
                            <th>Parameter</th>
                            <th>Weightage</th>
                            <th>Score (0-100)</th>
                            <th>Weighted Score</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {performance.parameters.map((p, i) => (
                            <tr key={i}>
                                <td>
                                    <div style={{ fontWeight: '600' }}>{p.parameter_name}</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>{p.description}</div>
                                </td>
                                <td>{p.weightage}%</td>
                                <td style={{ fontWeight: '600' }}>{p.score}</td>
                                <td style={{ fontWeight: '700', color: '#003f88' }}>{p.weighted_score}</td>
                                <td style={{ fontSize: '12px', fontStyle: 'italic' }}>{p.parameter_remarks || 'None'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#eef3f7' }}>
                            <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px' }}>Final Weighted Total:</td>
                            <td style={{ fontWeight: 'bold', color: '#003f88', fontSize: '18px' }}>{performance.weighted_score}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Graphical Section */}
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3 className="chart-title">Performance Radar</h3>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="Performance" dataKey="A" stroke="#003f88" fill="#003f88" fillOpacity={0.6} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="chart-card">
                        <h3 className="chart-title">Manager Remarks</h3>
                        <div style={{ padding: '20px', background: '#fff9c4', borderRadius: '8px', minHeight: '150px', borderLeft: '5px solid #fbc02d' }}>
                            {performance.manager_remarks || "No overall remarks provided for this evaluation cycle."}
                        </div>
                        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {performance.status === 'completed' ? <FaCheckCircle color="#2e7d32" /> : <FaClock color="#f9a825" />}
                                <span>Evaluation Status: <strong>{performance.status}</strong></span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                                Submitted on: {performance.submitted_at ? new Date(performance.submitted_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '50px', textAlign: 'center', color: '#aaa', fontSize: '11px' }}>
                    This is an electronically generated report from Perfomix Performance Management System.
                </div>
            </div>
        </div>
    );
};

export default IndividualReport;
