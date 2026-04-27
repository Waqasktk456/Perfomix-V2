import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "./performance-report.css";
import "../Employees/Employees.css";
import axios from 'axios';
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';
import { generateEnhancedOrgReport } from '../../utils/enhancedOrgReportPDF_COMPLETE';

const AVATAR_COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#16a085',
  '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#1abc9c',
];
const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const DEPT_BADGE_COLORS = [
  { bg: '#e8f0fe', text: '#4a6fa5' },
  { bg: '#e8f5e9', text: '#4a7c59' },
  { bg: '#fef9e7', text: '#8a7340' },
  { bg: '#f3e8ff', text: '#7a5fa5' },
  { bg: '#e0f7fa', text: '#3d7a82' },
  { bg: '#fce4ec', text: '#a05070' },
  { bg: '#fff3e0', text: '#8a6040' },
  { bg: '#e8eaf6', text: '#5560a0' },
];
const getDeptBadgeColor = (dept = '') => {
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_BADGE_COLORS[Math.abs(hash) % DEPT_BADGE_COLORS.length];
};

const EmployeePerformanceReport = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("All");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  
  // Search states
  const [searchType, setSearchType] = useState("name");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchEmployeeEvaluations();
    }
  }, [selectedCycleId]);
  const fetchCycles = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('http://localhost:5000/api/cycles', config);
      const cyclesData = Array.isArray(response.data) ? response.data : [];
      const filtered = cyclesData.filter(c => c.status !== 'draft');
      setCycles(filtered);
      if (filtered.length > 0) {
        const saved = sessionStorage.getItem('perf_report_cycle_id');
        const savedId = saved ? (isNaN(saved) ? saved : Number(saved)) : null;
        const toSelect = (savedId && filtered.find(c => c.id == savedId)) ? savedId : filtered[0].id;
        setSelectedCycleId(toSelect);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast.error('Failed to fetch evaluation cycles');
      setLoading(false);
    }
  };

  const fetchEmployeeEvaluations = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(`http://localhost:5000/api/evaluations/all-status?cycle_id=${selectedCycleId}`, config);
      if (response.data.success) {
        const evaluations = Array.isArray(response.data.data) ? response.data.data : [];

        const mappedEmployees = evaluations.map(emp => ({
          evaluation_id: emp.id,
          id: emp.Employee_id,
          profile: emp.Profile_image,
          name: `${emp.First_name} ${emp.Last_name}`,
          department: emp.Department_name,
          team: emp.Team_name || 'N/A',
          designation: emp.Designation,
          status: emp.evaluation_status || 'Pending',
          score: Number(emp.overall_weighted_score).toFixed(2) || '0.00',
          action: (emp.evaluation_status === "Complete" || emp.evaluation_status === "Completed") ? "Download Report" : "Send Reminder",
          email: emp.Email,
          role: emp.Role,
          organization: emp.Organization
        }));

        setEmployees(mappedEmployees);

        // Restore search state and scroll if coming back from view-performance-report
        const savedScroll     = sessionStorage.getItem('perf_report_scroll');
        const savedSearchType = sessionStorage.getItem('perf_report_search_type');
        const savedSearchVal  = sessionStorage.getItem('perf_report_search_value');
        if (savedSearchType) { setSearchType(savedSearchType); sessionStorage.removeItem('perf_report_search_type'); }
        // Only restore search value if it's NOT a name search
        if (savedSearchVal !== null && savedSearchType !== 'name') {
          setSearchValue(savedSearchVal);
        } else {
          setSearchValue('');
        }
        sessionStorage.removeItem('perf_report_search_value');
        if (savedScroll) {
          sessionStorage.removeItem('perf_report_scroll');
          setTimeout(() => {
            const container = document.querySelector('.table-container-scroll') || document.querySelector('.content');
            if (container) container.scrollTop = Number(savedScroll);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error fetching employee evaluations:', error);
      toast.error('Failed to fetch employee evaluations');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on selected tab and search
  const filteredEmployees = employees.filter(emp => {
    // Tab filter
    if (selectedTab !== "All" && emp.status !== selectedTab) return false;
    
    // Search filter
    if (!searchValue.trim()) return true;
    
    const value = searchValue.toLowerCase();
    
    switch (searchType) {
      case "name":
        return emp.name.toLowerCase().includes(value);
      case "department":
        return !searchValue || emp.department === searchValue;
      default:
        return true;
    }
  });

  const exportToPDF = async () => {
    if (!selectedCycleId) {
      toast.error("Please select an evaluation cycle");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      toast.info("Generating organization report...");
      const response = await axios.get(`http://localhost:5000/api/reports/admin/org-summary?cycle_id=${selectedCycleId}`, config);
      if (response.data.success) {
        await generateEnhancedOrgReport({ ...response.data, _cycleId: selectedCycleId });
        toast.success("Organization report downloaded");
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error("Failed to generate report");
    }
  };

  const exportToCSV = async () => {
    if (!selectedCycleId) {
      toast.error("Please select an evaluation cycle");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`http://localhost:5000/api/reports/admin/employee-list?cycle_id=${selectedCycleId}`, config);

      if (response.data.success) {
        const headers = ["Employee ID", "Name", "Department", "Designation", "Score", "Level", "Status"];
        const rows = response.data.employees.map(emp => [
          emp.employee_id,
          emp.name,
          emp.department,
          emp.designation,
          emp.total_score,
          emp.performance_level,
          emp.evaluation_status
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
          + headers.join(",") + "\n"
          + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Perfomix_Employee_Performance_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV exported successfully");
      }
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast.error("Failed to export CSV");
    }
  };

  const exportIndividualPDF = async (emp) => {
    if (!emp || !emp.evaluation_id) {
      toast.error("Evaluation record not found for this employee");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`http://localhost:5000/api/reports/individual/${emp.evaluation_id}`, config);

      if (res.data.success) {
        toast.info(`Generating assessment for ${emp.name}...`);
        await generateProfessionalPDF(res.data, 'individual-assessment');
        toast.success("Assessment report downloaded");
      }
    } catch (error) {
      console.error('Individual PDF Export Error:', error);
      toast.error("Failed to generate individual assessment");
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const renderProfileImage = (emp) => {
    if (emp.profile && emp.profile !== 'https://via.placeholder.com/40') {
      return <img src={emp.profile} alt="Profile" className="profile-pic" />;
    } else {
      return (
        <div className="initials-avatar">
          {getInitials(emp.name)}
        </div>
      );
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="performance-report-container">
      <div className="filter-tabs">
        <select
          className="cycle-select"
          value={selectedCycleId}
          onChange={(e) => { setSelectedCycleId(e.target.value); sessionStorage.setItem('perf_report_cycle_id', e.target.value); }}
          style={{ 
            marginRight: '20px', 
            padding: '6px 10px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            fontSize: '14px',
            color: '#6b7280',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>{cycle.name || cycle.cycle_name}</option>
          ))}
        </select>
        {["All", "Pending", "Complete"].map(tab => (
          <span
            key={tab}
            className={selectedTab === tab ? "active-tab" : ""}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Search Bar and Export Button in same line */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '10px', justifyContent: 'space-between' }}>
        <div className="search-container-main" style={{ flex: '0 0 auto', maxWidth: '600px', marginBottom: 0 }}>
          <div className="search-input-wrapper">
            {searchType === 'department' ? (
              <select
                className="search-input-field"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  cursor: 'pointer',
                  color: searchValue ? '#1e3a5f' : '#94a3b8',
                  fontWeight: searchValue ? 600 : 400,
                }}
              >
                <option value="" style={{ color: '#94a3b8', fontWeight: 400 }}>— Select Department —</option>
                {[...new Set(employees.map(e => e.department).filter(Boolean))].sort().map(dept => (
                  <option key={dept} value={dept} style={{ color: '#1e3a5f', fontWeight: 500, padding: '8px' }}>{dept}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="search-input-field"
                placeholder={`Search by ${searchType}...`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            )}
          </div>

          <div className="search-type-buttons">
            <button
              type="button"
              className={`search-type-btn ${searchType === 'name' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSearchType('name'); setSearchValue(''); }}
            >
              Name
            </button>
            <button
              type="button"
              className={`search-type-btn ${searchType === 'department' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSearchType('department'); setSearchValue(''); }}
            >
              Department
            </button>
          </div>
        </div>

        <div className="exportt-container" style={{ marginBottom: 0, flex: '0 0 auto', width: 'auto', position: 'relative' }}>
          <button
            className="exportt-report-btn"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            Export Report <FaChevronDown />
          </button>
          {showExportOptions && (
            <div className="export-options">
              <button onClick={exportToPDF}>Export as PDF</button>
              <button onClick={exportToCSV}>Export as CSV</button>
              {selectedEmployee && (
                <button onClick={() => exportIndividualPDF(selectedEmployee)}>
                  Export Selected Employee
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table with fixed height and scroll */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
        {/* Fixed Header Table */}
        <table className="report-table employees-table" style={{ marginBottom: 0 }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '11%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 10 }}><span style={{ position: 'relative', left: '30px', fontWeight: 700, color: 'white' }}>Name</span></th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Department </th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Team</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Designation</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Evaluation Status</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Score</th>
              <th style={{ textAlign: 'center', fontWeight: 700, color: 'white', background: '#003f88', borderBottom: '2px solid #003f88' }}>Action</th>
            </tr>
          </thead>
        </table>
        {/* Scrollable Body */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
          <table className="report-table employees-table" style={{ marginTop: 0 }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, index) => (
                <tr
                  key={index}
                  onClick={() => {
                    const container = document.querySelector('.table-container-scroll') || document.querySelector('.content');
                    if (container) sessionStorage.setItem('perf_report_scroll', container.scrollTop);
                    sessionStorage.setItem('perf_report_cycle_id', selectedCycleId);
                    sessionStorage.setItem('perf_report_search_type', searchType);
                    sessionStorage.setItem('perf_report_search_value', searchValue);
                    navigate('/view-performance-report', {
                      state: { employee: emp, cycleId: selectedCycleId }
                    });
                  }}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <td>
                    <div className="emp-name-cell">
                      {emp.profile && emp.profile !== 'https://via.placeholder.com/40' ? (
                        <img
                          src={emp.profile.startsWith('http') ? emp.profile : `http://localhost:5000${emp.profile}`}
                          alt={emp.name}
                          className="emp-avatar"
                        />
                      ) : (
                        <div
                          className="emp-avatar emp-avatar-fallback"
                          style={{ background: getAvatarColor(emp.name) }}
                        >
                          {getInitials(emp.name)}
                        </div>
                      )}
                      <span className="emp-name-text" style={{ fontWeight: 600, color: '#1e3a5f' }}>{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {emp.department ? (() => {
                      const c = getDeptBadgeColor(emp.department);
                      return <span className="dept-badge" style={{ background: c.bg, color: c.text }}>{emp.department}</span>;
                    })() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{emp.team}</td>
                  <td style={{ textAlign: 'center' }}>{emp.designation}</td>
                  <td className={emp.status === "Complete" ? "status-complete" : "status-pending"}>{emp.status}</td>
                  <td>{emp.score}</td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      title="View Performance"
                      onClick={() => {
                        const container = document.querySelector('.table-container-scroll') || document.querySelector('.content');
                        if (container) sessionStorage.setItem('perf_report_scroll', container.scrollTop);
                        sessionStorage.setItem('perf_report_cycle_id', selectedCycleId);
                        sessionStorage.setItem('perf_report_search_type', searchType);
                        sessionStorage.setItem('perf_report_search_value', searchValue);
                        navigate('/view-performance-report', {
                          state: { employee: emp, cycleId: selectedCycleId }
                        });
                      }}
                      className="organization-icon-button action-btn-view"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      title="Download Report"
                      onClick={async () => {
                        if (!emp || !emp.evaluation_id) {
                          toast.error("Evaluation record not found for this employee");
                          return;
                        }
                        try {
                          const token = localStorage.getItem('token');
                          const config = { headers: { Authorization: `Bearer ${token}` } };
                          const res = await axios.get(`http://localhost:5000/api/reports/individual/${emp.evaluation_id}`, config);
                          if (res.data.success) {
                            toast.info(`Generating assessment for ${emp.name}...`);
                            await generateProfessionalPDF(res.data, 'individual-assessment');
                            toast.success("Assessment report downloaded");
                          } else {
                            toast.error("Failed to fetch report data");
                          }
                        } catch (error) {
                          console.error('Employee report error:', error);
                          toast.error("Failed to generate report");
                        }
                      }}
                      className="organization-icon-button action-btn-view"
                      style={{ marginLeft: '4px' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeePerformanceReport;
