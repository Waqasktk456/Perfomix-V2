import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import AddSelectField from "../../components/AddSelectField";
import "./AddEmployees.css";
import '../../styles/typography.css';
import axios from 'axios';
import SuccessModal from '../../modals/SuccessModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddEmployees = () => {
  const { Employee_id } = useParams();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    user_password: '',
    department_id: '',
    designation: '',
    role: '',
    joining_date: '',
    employee_code: '',
    team_id: '',
    user_id: ''
  });

  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [errors, setErrors] = useState({});

  // Role options with proper display and DB values
  const roleOptions = [
    { value: "staff", label: "Staff" },
    { value: "line-manager", label: "Line Manager" },
    { value: "admin", label: "Admin" }
  ];

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("No authentication token found");
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  // Fetch departments and teams
  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = getAuthConfig();
        const deptResponse = await axios.get('http://localhost:5000/api/departments', config);
        setDepartments(deptResponse.data || []);

        // Fetch teams
        const teamResponse = await axios.get('http://localhost:5000/api/teams', config);
        setTeams(teamResponse.data || []);

        if (!Employee_id && deptResponse.data?.length > 0) {
          setFormData(prev => ({ ...prev, department_id: deptResponse.data[0].id.toString() }));
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load departments or teams');
        }
      }
    };
    fetchData();
  }, [Employee_id, navigate]);

  // Fetch employee data for edit
  useEffect(() => {
    if (!Employee_id) return;
    const fetchEmployee = async () => {
      try {
        const config = getAuthConfig();
        const response = await axios.get(`http://localhost:5000/api/employees/${Employee_id}`, config);
        const data = response.data.data;

        const formattedData = {
          ...data,
          department_id: data.department_id?.toString() || '',
          team_id: data.team_id?.toString() || '',
          user_id: data.user_id?.toString() || '',
          user_password: '' // never prefill password
        };

        setFormData(formattedData);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load employee data');
        }
      }
    };
    fetchEmployee();
  }, [Employee_id, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!Employee_id && !formData.user_password.trim()) newErrors.user_password = 'Password is required';
    if (!formData.department_id) newErrors.department_id = 'Department is required';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.joining_date) newErrors.joining_date = 'Joining date is required';

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    try {
      const config = getAuthConfig();
      const payload = { ...formData };

      // Convert empty employee_code to null to avoid duplicate error
      if (!payload.employee_code?.trim()) {
        payload.employee_code = null;
      }

      // Remove password if empty on update
      if (!payload.user_password) delete payload.user_password;

      if (Employee_id) {
        await axios.put(`http://localhost:5000/api/employees/${Employee_id}`, payload, config);
      } else {
        await axios.post('http://localhost:5000/api/employees', payload, config);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/employees');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(err.response?.data?.error || 'Failed to save employee');
      }
    }
  };

  const selectedDepartmentName = departments.find(d => d.id.toString() === formData.department_id)?.department_name || '';
  const selectedTeamName = teams.find(t => t.id.toString() === formData.team_id)?.team_name || '';
  const selectedRoleLabel = roleOptions.find(r => r.value === formData.role)?.label || '';

  return (
    <div className="add-employee-container">
      <ToastContainer position="top-right" autoClose={3000} theme="light" style={{ zIndex: 9999 }} />

      <h2 className="form-title">{Employee_id ? 'Edit Employee' : 'Add Employee'}</h2>

      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={Employee_id ? "Employee updated successfully." : "Employee added successfully."}
      />

      <div className="form-grid">
        <AddInputField label="First Name*" placeholder="Enter first name" value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} error={errors.first_name} />
        <AddInputField label="Last Name*" placeholder="Enter last name" value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} error={errors.last_name} />
        <AddInputField label="Email*" placeholder="Enter email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} error={errors.email} />
        <AddInputField label="Password*" type="password" placeholder="Enter password" value={formData.user_password} onChange={e => handleInputChange('user_password', e.target.value)} error={errors.user_password} />

        <AddSelectField
          label="Department*"
          options={departments.map(d => d.department_name)}
          value={selectedDepartmentName}
          onChange={e => {
            const selected = departments.find(d => d.department_name === e.target.value);
            handleInputChange('department_id', selected ? selected.id.toString() : '');
          }}
          error={errors.department_id}
        />

        <AddInputField label="Designation*" placeholder="Enter designation" value={formData.designation} onChange={e => handleInputChange('designation', e.target.value)} error={errors.designation} />

        {/* Fixed Role Dropdown */}
        <AddSelectField
          label="Role*"
          options={roleOptions.map(o => o.label)}
          value={selectedRoleLabel}
          onChange={e => {
            const selected = roleOptions.find(o => o.label === e.target.value);
            handleInputChange('role', selected ? selected.value : '');
          }}
          error={errors.role}
        />

        <AddInputField label="Joining Date*" type="date" value={formData.joining_date} onChange={e => handleInputChange('joining_date', e.target.value)} error={errors.joining_date} />

        <AddInputField 
          label="Employee Code" 
          placeholder="Optional - leave blank if not needed" 
          value={formData.employee_code || ''} 
          onChange={e => handleInputChange('employee_code', e.target.value)} 
        />

        {/* <AddSelectField
          label="Team"
          options={teams.map(t => t.team_name)}
          value={selectedTeamName}
          onChange={e => {
            const selected = teams.find(t => t.team_name === e.target.value);
            handleInputChange('team_id', selected ? selected.id.toString() : '');
          }}
        /> */}
      </div>

      <div className="form-buttons">
        <button className="save-btn" onClick={handleSubmit}>Save</button>
      </div>
    </div>
  );
};

export default AddEmployees;