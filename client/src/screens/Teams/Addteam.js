import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import AddSelectField from "../../components/AddSelectField";
import "./Addteam.css";
import '../../styles/typography.css';
import axios from 'axios';
import SuccessModal from '../../modals/SuccessModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddTeam = () => {
  const { id: team_id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    team_name: '',
    department_id: '',
    member_ids: [] // Array of employee IDs
  });

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [errors, setErrors] = useState({});

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("No authentication token found");
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const config = getAuthConfig();
        const deptResponse = await axios.get('http://localhost:5000/api/departments', config);
        setDepartments(deptResponse.data || []);

        if (!team_id && deptResponse.data?.length > 0) {
          setFormData(prev => ({ ...prev, department_id: deptResponse.data[0].id.toString() }));
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load departments');
        }
      }
    };
    fetchDepartments();
  }, [team_id, navigate]);

  // Fetch employees when department changes
  useEffect(() => {
    if (!formData.department_id) {
      setEmployees([]);
      return;
    }

    const fetchEmployees = async () => {
      try {
        const config = getAuthConfig();
        const response = await axios.get('http://localhost:5000/api/employees', config);
        // Filter: Only show 'staff' role (case-insensitive)
        const staffOnly = (response.data || []).filter(emp => (emp.role || '').toLowerCase() === 'staff');
        setEmployees(staffOnly);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load employees');
        }
      }
    };
    fetchEmployees();
  }, [formData.department_id, navigate]);

  // Fetch team data for edit
  useEffect(() => {
    if (!team_id) return;
    const fetchTeam = async () => {
      try {
        const config = getAuthConfig();
        const response = await axios.get(`http://localhost:5000/api/teams/${team_id}`, config);
        const data = response.data.data;

        setFormData({
          team_name: data.team_name || '',
          department_id: data.department_id?.toString() || '',
          member_ids: data.member_ids || []
        });
        setSelectedMembers(data.member_ids || []);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load team data');
        }
      }
    };
    fetchTeam();
  }, [team_id, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.team_name.trim()) newErrors.team_name = 'Team name is required';
    if (!formData.department_id) newErrors.department_id = 'Department is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleDepartmentChange = (e) => {
    const selected = departments.find(d => d.department_name === e.target.value);
    handleInputChange('department_id', selected ? selected.id.toString() : '');
    // Reset selected members when department changes
    setSelectedMembers([]);
    setFormData(prev => ({ ...prev, member_ids: [] }));
  };

  const handleMemberToggle = (employeeId) => {
    setSelectedMembers(prev => {
      // Toggle selection
      const newSelection = prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];

      // Update form data immediately
      setFormData(prevData => ({ ...prevData, member_ids: newSelection }));
      return newSelection;
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    try {
      const config = getAuthConfig();
      const payload = {
        team_name: formData.team_name,
        department_id: parseInt(formData.department_id),
        member_ids: formData.member_ids
      };

      if (team_id) {
        await axios.put(`http://localhost:5000/api/teams/${team_id}`, payload, config);
      } else {
        await axios.post('http://localhost:5000/api/teams', payload, config);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/teams');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(err.response?.data?.error || 'Failed to save team');
      }
    }
  };

  const selectedDepartmentName = departments.find(d => d.id.toString() === formData.department_id)?.department_name || '';

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase();
    const firstName = (emp.first_name || '').toLowerCase();
    const lastName = (emp.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const deptName = (emp.department_name || '').toLowerCase();

    // Explicit checks for Name parts OR Full Name OR Department
    return firstName.includes(search) ||
      lastName.includes(search) ||
      fullName.includes(search) ||
      deptName.includes(search);
  });

  return (
    <div className="add-employee-container">
      <ToastContainer position="top-right" autoClose={3000} theme="light" style={{ zIndex: 9999 }} />

      <h2 className="form-title">{team_id ? 'Edit Team' : 'Add Team'}</h2>

      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={team_id ? "Team updated successfully." : "Team added successfully."}
      />

      <div className="form-grid">
        <AddInputField
          label="Team Name*"
          placeholder="Enter team name"
          value={formData.team_name}
          onChange={e => handleInputChange('team_name', e.target.value)}
          error={errors.team_name}
        />

        <AddSelectField
          label="Department*"
          options={departments.map(d => d.department_name)}
          value={selectedDepartmentName}
          onChange={handleDepartmentChange}
          error={errors.department_id}
        />

        {formData.department_id && employees.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="team-members-label">
              Team Members
            </label>

            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            <div className="custom-members-list">
              {/* Header Row */}
              <div className="members-header">
                <div>Employee Name</div>
                <div>Email</div>
                <div>Department</div>
              </div>

              {/* List Items */}
              {filteredEmployees.map(emp => {
                const isSelected = selectedMembers.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    className={`member-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleMemberToggle(emp.id)}
                  >
                    <div className="member-text" style={{ fontWeight: 500 }}>
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="member-text" style={{ fontSize: '12px', opacity: isSelected ? 0.9 : 0.7 }}>
                      {emp.email}
                    </div>
                    <div className="member-text">
                      {emp.department_name || 'No Dept'}
                    </div>
                  </div>
                );
              })}
            </div>

            <small className="helper-text">
              Click rows to select/deselect members
            </small>
          </div>
        )}
      </div>

      <div className="form-buttons">
        <button className="save-btn" onClick={handleSubmit}>Save</button>
      </div>
    </div>
  );
};

export default AddTeam;