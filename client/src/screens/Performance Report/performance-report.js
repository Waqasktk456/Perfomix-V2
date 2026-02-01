import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "./performance-report.css";
import axios from 'axios';
import { toast } from 'react-toastify';
import { generateProfessionalPDF } from '../../utils/pdfGenerator';

const EmployeePerformanceReport = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("All");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");

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
      setCycles(cyclesData);
      if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id);
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
          designation: emp.Designation,
          status: emp.evaluation_status || 'Pending',
          score: Math.round(emp.overall_weighted_score) || 0,
          action: (emp.evaluation_status === "Complete" || emp.evaluation_status === "Completed") ? "Download Report" : "Send Reminder",
          email: emp.Email,
          role: emp.Role,
          organization: emp.Organization
        }));

        setEmployees(mappedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employee evaluations:', error);
      toast.error('Failed to fetch employee evaluations');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on selected tab
  const filteredEmployees = employees.filter(emp => {
    if (selectedTab === "All") return true;
    return emp.status === selectedTab;
  });

  const exportToPDF = async () => {
    if (!selectedCycleId) {
      toast.error("Please select an evaluation cycle");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`http://localhost:5000/api/reports/admin/org-summary?cycle_id=${selectedCycleId}`, config);

      if (response.data.success) {
        toast.info("Generating professional organization report...");
        await generateProfessionalPDF(response.data, 'admin-summary');
        toast.success("Organization report downloaded");
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error("Failed to generate professional report");
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
      <h2 className="report-title">Employee Performance Report</h2>

      <div className="filter-tabs">
        <select
          className="cycle-select"
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          style={{ marginRight: '20px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
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

      <div className="exportt-container">
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

      <table className="report-table">
        <thead>
          <tr>
            <th>SR NO</th>
            <th>Profile</th>
            <th>Employee Name </th>
            <th>Department </th>
            <th>Designation</th>
            <th>Evaluation Status</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((emp, index) => (
            <tr
              key={index}
              className={selectedEmployee && selectedEmployee.id === emp.id && selectedEmployee._rowIndex === index ? 'highlighted-row' : ''}
              onClick={() => setSelectedEmployee({ ...emp, _rowIndex: index })}
              style={{ cursor: 'pointer' }}
            >
              <td>{index + 1}</td>
              <td>{renderProfileImage(emp)}</td>
              <td>{emp.name}</td>
              <td>{emp.department}</td>
              <td>{emp.designation}</td>
              <td className={emp.status === "Complete" ? "status-complete" : "status-pending"}>{emp.status}</td>
              <td>{emp.score}</td>
              <td className={emp.action === "Download Report" ? "action-download" : "action-reminder"}>{emp.action}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bottom-buttons">
        <button
          className="profile-btn"
          onClick={() => {
            if (selectedEmployee) {
              navigate(`/employees/details/${selectedEmployee.id}`);
            }
          }}
          disabled={!selectedEmployee}
        >
          View Profile
        </button>
        <button
          className="performance-btn"
          onClick={() => selectedEmployee && navigate('/view-performance-report', { state: { employee: selectedEmployee } })}
          disabled={!selectedEmployee}
        >
          View Performance
        </button>
      </div>
    </div>
  );
};

export default EmployeePerformanceReport;
