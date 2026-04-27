import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AddInputField from "../../components/AddInputField";
import AddSelectField from "../../components/AddSelectField";
import "./Addteam.css";
import "../Employees/Employees.css";
import '../../styles/typography.css';
import axios from 'axios';
import SuccessModal from '../../modals/SuccessModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DEPT_MAP = [
  { keywords: ['software', 'engineering'], label: 'Engineering', bg: '#dbeafe', color: '#1d4ed8' },
  { keywords: ['qa', 'testing'],           label: 'QA',          bg: '#ede9fe', color: '#6d28d9' },
  { keywords: ['devops', 'infra'],         label: 'DevOps',      bg: '#e0e7ff', color: '#3730a3' },
  { keywords: ['ui', 'ux', 'design'],      label: 'Design',      bg: '#fce7f3', color: '#9d174d' },
  { keywords: ['product', 'project'],      label: 'Product',     bg: '#ffedd5', color: '#c2410c' },
  { keywords: ['sales', 'business'],       label: 'Sales & BD',  bg: '#dcfce7', color: '#15803d' },
  { keywords: ['marketing'],               label: 'Marketing',   bg: '#fef9c3', color: '#a16207' },
  { keywords: ['hr', 'human'],             label: 'HR',          bg: '#ccfbf1', color: '#0f766e' },
  { keywords: ['support'],                 label: 'Support',     bg: '#cffafe', color: '#0e7490' },
  { keywords: ['finance', 'legal'],        label: 'Finance',     bg: '#f1f5f9', color: '#475569' },
  { keywords: ['leadership', 'executive'], label: 'Executive',   bg: '#fee2e2', color: '#b91c1c' },
];
const getDeptBadge = (name = '') => {
  const lower = name.toLowerCase();
  const m = DEPT_MAP.find(d => d.keywords.some(k => lower.includes(k)));
  return m ? { ...m, full: name } : { label: name || 'N/A', bg: '#f1f5f9', color: '#475569', full: name };
};

const AddTeam = () => {
  const { id: team_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPage = new URLSearchParams(location.search).get('returnPage') || '1';
  const navigateBack = () => navigate(`/teams?page=${returnPage}`);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
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
  const [filterDeptId, setFilterDeptId] = useState('all');
  const [dataLoaded, setDataLoaded] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("No authentication token found");
    return { headers: { 'Authorization': `Bearer ${token}` } };
  };

  // Fetch departments, employees, and team data (if editing)
  useEffect(() => {
    setDataLoaded(false);
    const fetchData = async () => {
      try {
        const config = getAuthConfig();
        
        // Fetch departments and employees first
        const [deptRes, empRes] = await Promise.all([
          axios.get('http://localhost:5000/api/departments', config),
          axios.get('http://localhost:5000/api/employees', config),
        ]);
        setDepartments(deptRes.data || []);
        // Deduplicate employees by id (JOIN on team_members can produce duplicates)
        const empMap = new Map();
        (empRes.data || []).forEach(e => { if (!empMap.has(e.id)) empMap.set(e.id, e); });
        setEmployees([...empMap.values()]);

        // If editing, fetch team data after employees are loaded
        if (team_id) {
          const teamRes = await axios.get(`http://localhost:5000/api/teams/${team_id}`, config);
          const data = teamRes.data.data;

          setFormData({
            team_name: data.team_name || '',
            department_id: data.department_id?.toString() || '',
            member_ids: data.member_ids || []
          });
          setSelectedMembers(data.member_ids || []);
          if (data.department_id) {
            setSearchType('department');
            setSearchTerm(data.department_id.toString());
          }
        }
        setDataLoaded(true);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        } else {
          toast.error('Failed to load data');
        }
        setDataLoaded(true);
      }
    };
    fetchData();
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
    const newId = selected ? selected.id.toString() : '';
    handleInputChange('department_id', newId);
    setFilterDeptId(newId || 'all');
    setSelectedMembers([]);
    setFormData(prev => ({ ...prev, member_ids: [] }));
  };

  const handleFilterDeptChange = (e) => {
    const val = e.target.value;
    setFilterDeptId(val);
    // Also sync the form department field
    if (val !== 'all') {
      handleInputChange('department_id', val);
    }
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
        navigateBack();
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

  const filteredEmployees = !dataLoaded ? [] : employees.filter(emp => {
    if (emp.role?.toLowerCase() !== 'staff') return false;

    if (searchType === 'name' && searchTerm) {
      return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    }

    if (searchType === 'department' && searchTerm) {
      return emp.department_id?.toString() === searchTerm;
    }

    return true;
  });

  return (
    <div className="add-employee-container" style={{ maxWidth: '100%' }}>
      <ToastContainer position="top-right" autoClose={3000} theme="light" style={{ zIndex: 9999 }} />

      <div className="employee-details-header" style={{ marginBottom: '16px' }}>
        <button className="back-button" onClick={navigateBack}>← Back</button>
        <div className="header-content">
          <h1>{team_id ? 'Edit Team' : 'Add Team'}</h1>
        </div>
      </div>

      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description={team_id ? "Team updated successfully." : "Team added successfully."}
      />

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* LEFT — 70% card */}
        <div style={{
          flex: '0 0 70%',
          minWidth: 0,
          background: '#fff',
          border: '1.5px solid #e1e8f0',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(45,108,223,0.07)',
          padding: '20px',
        }}>
          <div className="form-grid">
            {/* Row 1: Team Name + Team Department — same width, height, vertically aligned */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>Team Name*</label>
                <input
                  className="search-input-field"
                  style={{ width: '100%' }}
                  placeholder="Enter team name"
                  value={formData.team_name}
                  onChange={e => handleInputChange('team_name', e.target.value)}
                />
                {errors.team_name && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.team_name}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '5px' }}>Team Department*</label>
                <select
                  value={formData.department_id}
                  onChange={e => handleInputChange('department_id', e.target.value)}
                  className="search-input-field"
                  style={{ cursor: 'pointer', color: '#334155', width: '100%', border: errors.department_id ? '2px solid #ef4444' : undefined }}
                >
                  <option value="" style={{ color: '#94a3b8' }}>Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id.toString()} style={{ color: '#334155' }}>{d.department_name}</option>
                  ))}
                </select>
                {errors.department_id && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.department_id}</span>}
              </div>
            </div>

            {/* Row 2: Search field + By Name / By Dept buttons + Select All (end) */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginBottom: '4px', alignItems: 'flex-end' }}>
              {/* Search field */}
              <div style={{ width: '240px', flexShrink: 0 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Search Employees
                </label>
                {searchType === 'department' ? (
                  <select
                    className="search-input-field"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ cursor: 'pointer', color: '#334155', width: '100%' }}
                  >
                    <option value="" style={{ color: '#334155' }}>All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id.toString()} style={{ color: '#334155' }}>{d.department_name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="search-input-field"
                    style={{ width: '100%' }}
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                )}
              </div>

              {/* Toggle buttons */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {[{ type: 'name', label: 'By Name' }, { type: 'department', label: 'By Dept' }].map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setSearchType(type); setSearchTerm(''); }}
                    style={{
                      width: '100px',
                      padding: '12px 0',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: 'var(--font-size-sm)',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 'var(--font-weight-bold)',
                      cursor: 'pointer',
                      background: searchType === type ? 'var(--primary-color)' : '#e1e8f0',
                      color: searchType === type ? '#fff' : '#475569',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Select All — pushed to end */}
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && filteredEmployees.every(e => selectedMembers.includes(e.id))}
                    onChange={() => {
                      const allSelected = filteredEmployees.every(e => selectedMembers.includes(e.id));
                      if (allSelected) {
                        setSelectedMembers(prev => prev.filter(id => !filteredEmployees.find(e => e.id === id)));
                        setFormData(prev => ({ ...prev, member_ids: prev.member_ids.filter(id => !filteredEmployees.find(e => e.id === id)) }));
                      } else {
                        const newIds = [...new Set([...selectedMembers, ...filteredEmployees.map(e => e.id)])];
                        setSelectedMembers(newIds);
                        setFormData(prev => ({ ...prev, member_ids: newIds }));
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  Select All
                </label>
              </div>
            </div>

            {employees.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="team-members-label">Team Members</label>

                <div style={{ border: '1px solid #c2d8f5', borderRadius: '8px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="employees-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '40px' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '26%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredEmployees.length > 0 && filteredEmployees.every(e => selectedMembers.includes(e.id))}
                            onChange={() => {
                              const allSelected = filteredEmployees.every(e => selectedMembers.includes(e.id));
                              if (allSelected) {
                                setSelectedMembers(prev => prev.filter(id => !filteredEmployees.find(e => e.id === id)));
                                setFormData(prev => ({ ...prev, member_ids: prev.member_ids.filter(id => !filteredEmployees.find(e => e.id === id)) }));
                              } else {
                                const newIds = [...new Set([...selectedMembers, ...filteredEmployees.map(e => e.id)])];
                                setSelectedMembers(newIds);
                                setFormData(prev => ({ ...prev, member_ids: newIds }));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </th>
                        <th>Name</th>
                        <th style={{ textAlign: 'center' }}>Department</th>
                        <th style={{ textAlign: 'center' }}>Designation</th>
                        <th style={{ textAlign: 'center' }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No employees found</td></tr>
                      ) : filteredEmployees.map(emp => {
                        const isSelected = selectedMembers.includes(emp.id);
                        const roleStyles = {
                          'Staff':        { bg: '#e8f5e9', color: '#2e7d32' },
                          'Line Manager': { bg: '#e3f2fd', color: '#1565c0' },
                          'Admin':        { bg: '#f3e8ff', color: '#6b21a8' },
                        };
                        const rs = roleStyles[emp.role] || { bg: '#f1f5f9', color: '#475569' };
                        const avatarBg = (() => {
                          const COLORS = ['#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#1abc9c'];
                          let h = 0;
                          const name = `${emp.first_name}${emp.last_name}`;
                          for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
                          return COLORS[Math.abs(h) % COLORS.length];
                        })();
                        return (
                          <tr
                            key={emp.id}
                            onClick={() => handleMemberToggle(emp.id)}
                            className={isSelected ? 'selected-row' : ''}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMemberToggle(emp.id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            </td>
                            <td>
                              <div className="emp-name-cell">
                                {emp.profile_image ? (
                                  <img
                                    src={`http://localhost:5000${emp.profile_image}`}
                                    alt={emp.first_name}
                                    className="emp-avatar"
                                  />
                                ) : (
                                  <div className="emp-avatar emp-avatar-fallback" style={{ background: avatarBg }}>
                                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                                  </div>
                                )}
                                <div style={{ lineHeight: 1.2 }}>
                                  <div className="emp-name-text" style={{ fontWeight: 600, fontSize: '13px' }}>{emp.first_name} {emp.last_name}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {(() => {
                                const db = getDeptBadge(emp.department_name);
                                return (
                                  <span
                                    title={db.full}
                                    style={{
                                      background: db.bg, color: db.color,
                                      padding: '2px 8px', borderRadius: '20px',
                                      fontSize: '11px', fontWeight: 600,
                                      display: 'inline-block', maxWidth: '90px',
                                      overflow: 'hidden', textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap', cursor: 'default'
                                    }}
                                  >
                                    {db.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                title={emp.designation || ''}
                                style={{
                                  display: 'inline-block', maxWidth: '110px',
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap', fontSize: '12px',
                                  color: '#334155', cursor: 'default'
                                }}
                              >
                                {emp.designation || 'N/A'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                background: rs.bg, color: rs.color,
                                padding: '2px 10px', borderRadius: '20px',
                                fontSize: '12px', fontWeight: 600
                              }}>
                                {emp.role || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                  <small className="helper-text" style={{ margin: 0 }}>Click rows or checkboxes to select/deselect members</small>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => navigateBack()}
                      style={{
                        padding: '8px 20px', border: '1.5px solid #2d6cdf', borderRadius: '6px',
                        background: '#fff', color: '#2d6cdf', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="add-employee-btn"
                      style={{ margin: 0, padding: '14px 18px', fontSize: 'var(--font-size-sm)', minWidth: '130px' }}
                    >
                      {team_id ? 'Update Team' : 'Create Team'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — 30% sticky summary card */}
        <div style={{
          flex: '0 0 28%',
          position: 'sticky',
          top: '16px',
          alignSelf: 'flex-start',
          background: '#fff',
          border: '1.5px solid #e1e8f0',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(45,108,223,0.07)',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            background: '#eaf1fb',
            borderBottom: '1.5px solid #c2d8f5',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e3a5f' }}>
              Selected Members
            </span>
            <span style={{
              background: '#2d6cdf', color: '#fff',
              borderRadius: '20px', padding: '2px 10px',
              fontSize: '13px', fontWeight: 700
            }}>
              {selectedMembers.length}
            </span>
          </div>

          {/* Card body */}
          <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', padding: '8px 0' }}>
            {selectedMembers.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', color: '#aab', fontSize: '14px' }}>
                No employees selected
              </div>
            ) : (
              selectedMembers.map(id => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                const db = getDeptBadge(emp.designation);
                const COLORS = ['#e74c3c','#e67e22','#f39c12','#27ae60','#16a085','#2980b9','#8e44ad','#d35400','#c0392b','#1abc9c'];
                let h = 0;
                const nm = `${emp.first_name}${emp.last_name}`;
                for (let i = 0; i < nm.length; i++) h = nm.charCodeAt(i) + ((h << 5) - h);
                const avatarBg = COLORS[Math.abs(h) % COLORS.length];
                return (
                  <div key={id} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '8px 0 8px 14px', borderBottom: '1px solid #f0f4fa', gap: '10px',
                    width: '100%'
                  }}>
                    {/* Avatar */}
                    {emp.profile_image ? (
                      <img
                        src={`http://localhost:5000${emp.profile_image}`}
                        alt={emp.first_name}
                        className="emp-avatar"
                        style={{ flexShrink: 0 }}
                      />
                    ) : (
                      <div className="emp-avatar emp-avatar-fallback" style={{ background: avatarBg, flexShrink: 0 }}>
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                    )}

                    {/* Name + designation badge */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ flex: '0 0 50%', fontWeight: 600, fontSize: '13px', color: '#1e3a5f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <span
                        title={emp.designation || ''}
                        style={{
                          flex: '0 0 50%', background: db.bg, color: db.color,
                          padding: '1px 7px', borderRadius: '20px',
                          fontSize: '10px', fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textAlign: 'center'
                        }}
                      >
                        {emp.designation || 'N/A'}
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleMemberToggle(id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ef4444', fontSize: '16px', padding: '2px 0',
                        borderRadius: '4px', lineHeight: 1, flexShrink: 0,
                        marginLeft: 'auto', paddingRight: '14px'
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AddTeam;