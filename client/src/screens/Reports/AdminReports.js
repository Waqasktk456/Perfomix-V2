import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { FaDownload, FaFilePdf, FaFileCsv, FaFilter } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import './reports.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminReports = () => {
    const [cycleId, setCycleId] = useState('');
    const [deptId, setDeptId] = useState('');
    const [cycles, setCycles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [employeeList, setEmployeeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [cycleRes, deptRes] = await Promise.all([
                axios.get('http://localhost:5000/api/cycles', config),
                axios.get('http://localhost:5000/api/departments', config)
            ]);

            setCycles(cycleRes.data);
            setDepartments(deptRes.data);

            // Set first cycle as default if available
            if (cycleRes.data.length > 0) {
                setCycleId(cycleRes.data[0].id);
            }
        } catch (error) {
            console.error('Initial data fetch error:', error);
            toast.error('Failed to load filters');
        }
    };

    useEffect(() => {
        if (cycleId) {
            fetchReportData();
        }
    }, [cycleId, deptId]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [summaryRes, employeesRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/reports/admin/org-summary?cycle_id=${cycleId}`, config),
                axios.get(`http://localhost:5000/api/reports/admin/employee-list?cycle_id=${cycleId}${deptId ? `&department_id=${deptId}` : ''}`, config)
            ]);

            setReportData(summaryRes.data);
            setEmployeeList(employeesRes.data.employees);
        } catch (error) {
            console.error('Report data fetch error:', error);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = async () => {
        const element = reportRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        pdf.save(`Perfomix_Org_Report_${reportData?.header?.cycle_name}_${new Date().toLocaleDateString()}.pdf`);
    };

    const exportToCSV = () => {
        const headers = ["Employee ID", "Name", "Department", "Team", "Manager", "Score", "Performance Level", "Status"];
        const rows = employeeList.map(emp => [
            emp.employee_id,
            emp.name,
            emp.department,
            emp.team || 'N/A',
            emp.manager_name || 'N/A',
            emp.total_score || 0,
            emp.performance_level,
            emp.evaluation_status
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Perfomix_Employee_Performance_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    if (loading && !reportData) return <div className="loading">Loading report data...</div>;

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h1 className="reports-title">Organization Performance Report</h1>
                <div className="export-buttons">
                    <button className="btn-export btn-pdf" onClick={exportToPDF} disabled={!reportData}>
                        <FaFilePdf /> Export PDF
                    </button>
                    <button className="btn-export btn-csv" onClick={exportToCSV} disabled={!reportData}>
                        <FaFileCsv /> Export CSV
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <label className="filter-label">Evaluation Cycle</label>
                    <select
                        className="filter-select"
                        value={cycleId}
                        onChange={(e) => setCycleId(e.target.value)}
                    >
                        {cycles.map(c => <option key={c.id} value={c.id}>{c.cycle_name}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label className="filter-label">Department</label>
                    <select
                        className="filter-select"
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.Department_name}</option>)}
                    </select>
                </div>
            </div>

            <div ref={reportRef} className="report-content-wrapper">
                {reportData && (
                    <>
                        {/* Report Header (Visible in PDF) */}
                        <div className="report-print-header" style={{ marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: '#003f88' }}>{reportData.header.organization_name}</h2>
                                    <p style={{ margin: '5px 0', color: '#666' }}>Organization Performance Report</p>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '13px', color: '#888' }}>
                                    <p style={{ margin: 0 }}>Generation Date: {new Date(reportData.header.generation_date).toLocaleDateString()}</p>
                                    <p style={{ margin: 0 }}>Cycle: {reportData.header.cycle_name}</p>
                                    <p style={{ margin: 0 }}>Duration: {new Date(reportData.header.start_date).toLocaleDateString()} - {new Date(reportData.header.end_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.average_score}</div>
                                <div className="stat-label">Average Performance Score</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.total_employees}</div>
                                <div className="stat-label">Total Employees Evaluated</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.completed}</div>
                                <div className="stat-label">Completed Evaluations</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{reportData.summary.pending}</div>
                                <div className="stat-label">Pending Evaluations</div>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="charts-grid">
                            <div className="chart-card">
                                <h3 className="chart-title">Performance Distribution</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={reportData.distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="count"
                                                nameKey="level"
                                                label
                                            >
                                                {reportData.distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="chart-card">
                                <h3 className="chart-title">Department-wise Average Performance</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={reportData.dept_stats}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="Department_name" axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f0f0f0' }} />
                                            <Bar dataKey="avg_score" fill="#003f88" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Top/Bottom Performers Grid */}
                        <div className="charts-grid">
                            <div className="chart-card">
                                <h3 className="chart-title">Top Performing Employees</h3>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.top_performers.map((emp, i) => (
                                            <tr key={i}>
                                                <td>{emp.First_name} {emp.Last_name}</td>
                                                <td style={{ color: '#888', fontSize: '12px' }}>{emp.Designation}</td>
                                                <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>{emp.overall_score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="chart-card">
                                <h3 className="chart-title">Lowest Performing Employees</h3>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.low_performers.map((emp, i) => (
                                            <tr key={i}>
                                                <td>{emp.First_name} {emp.Last_name}</td>
                                                <td style={{ color: '#888', fontSize: '12px' }}>{emp.Designation}</td>
                                                <td style={{ fontWeight: 'bold', color: '#c62828' }}>{emp.overall_score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Full Employee Table */}
                        <div className="report-table-container">
                            <h3 className="chart-title">Detailed Employee Performance Table</h3>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Employee Name</th>
                                        <th>Department</th>
                                        <th>Team</th>
                                        <th>Line Manager</th>
                                        <th>Total Score</th>
                                        <th>Level</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employeeList.map((emp, i) => (
                                        <tr key={i}>
                                            <td>{emp.name}</td>
                                            <td>{emp.department}</td>
                                            <td>{emp.team || 'N/A'}</td>
                                            <td>{emp.manager_name || 'N/A'}</td>
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

export default AdminReports;
