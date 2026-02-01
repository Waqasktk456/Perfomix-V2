import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line
} from 'recharts';
import { FaDownload, FaFilePdf, FaChevronRight } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './reports.css';

const LineManagerReports = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef();

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:5000/api/line-manager/assigned-teams', config);

            setAssignments(res.data.teams);
            if (res.data.teams.length > 0) {
                setSelectedAssignment(res.data.teams[0].assignment_id);
            }
        } catch (error) {
            console.error('Fetch assignments error:', error);
            toast.error('Failed to load assigned teams');
        }
    };

    useEffect(() => {
        if (selectedAssignment) {
            fetchTeamReport();
        }
    }, [selectedAssignment]);

    const fetchTeamReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:5000/api/reports/manager/team-report?assignment_id=${selectedAssignment}`, config);
            setReportData(res.data);
        } catch (error) {
            console.error('Team report fetch error:', error);
            toast.error('Failed to load team report');
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
        pdf.save(`Team_Report_${reportData?.team_info?.team_name}_${new Date().toLocaleDateString()}.pdf`);
    };

    if (loading && !reportData) return <div className="loading">Loading team report...</div>;

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h1 className="reports-title">Team Performance Report</h1>
                <div className="export-buttons">
                    <button className="btn-export btn-pdf" onClick={exportToPDF} disabled={!reportData}>
                        <FaFilePdf /> Export Team PDF
                    </button>
                    <button
                        className="btn-export"
                        style={{ backgroundColor: '#003f88', color: 'white' }}
                        onClick={() => navigate('/linemanager-performance')}
                    >
                        View My Score <FaChevronRight />
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Select Team & Cycle</label>
                    <select
                        className="filter-select"
                        value={selectedAssignment}
                        onChange={(e) => setSelectedAssignment(e.target.value)}
                        style={{ minWidth: '300px' }}
                    >
                        {assignments.map(a => (
                            <option key={a.assignment_id} value={a.assignment_id}>
                                {a.team_name} - {a.cycle_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div ref={reportRef} className="report-content-wrapper">
                {reportData && (
                    <>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.average_score}</div>
                                <div className="stat-label">Team Average Score</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.completion_percentage}%</div>
                                <div className="stat-label">Evaluation Completion</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: '#2e7d32' }}>{reportData.summary.highest_score}</div>
                                <div className="stat-label">Highest Score</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: '#c62828' }}>{reportData.summary.lowest_score}</div>
                                <div className="stat-label">Lowest Score</div>
                            </div>
                        </div>

                        <div className="chart-card" style={{ marginBottom: '30px' }}>
                            <h3 className="chart-title">Employee Score Comparison</h3>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={reportData.employees}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="total_score" fill="#003f88" radius={[4, 4, 0, 0]} barSize={50} name="Total Score" />
                                        <Line type="monotone" dataKey="total_score" stroke="#ff7300" strokeWidth={2} name="Trend" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="report-table-container">
                            <h3 className="chart-title">Team Member Performance</h3>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Score</th>
                                        <th>Performance Level</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.employees.map((emp, i) => (
                                        <tr key={i}>
                                            <td>{emp.name}</td>
                                            <td>{emp.role}</td>
                                            <td style={{ fontWeight: 'bold' }}>{parseFloat(emp.total_score || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`performance-badge badge-${emp.performance_level?.toLowerCase()}`}>
                                                    {emp.performance_level}
                                                </span>
                                            </td>
                                            <td>{emp.evaluation_status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LineManagerReports;
