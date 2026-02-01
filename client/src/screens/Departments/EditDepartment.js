import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AddDepartment.css";
import SuccessModal from "../../modals/SuccessModal";

const EditDepartment = () => {
  const navigate = useNavigate();
  const { departmentName } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    head: "",
    employees: "",
    email: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Load department data from localStorage
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    const department = departments.find(dept => dept.name === departmentName);
    
    if (department) {
      setFormData({
        name: department.name,
        head: department.head,
        employees: department.employees.toString(),
        email: department.email
      });
    }
  }, [departmentName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Validate required fields
    if (!formData.name || !formData.head || !formData.employees || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }

    // Get existing departments from localStorage
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    
    // Update the department
    const updatedDepartments = departments.map(dept => 
      dept.name === departmentName ? {
        ...formData,
        employees: parseInt(formData.employees)
      } : dept
    );
    
    localStorage.setItem('departments', JSON.stringify(updatedDepartments));
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/departments');
    }, 200);
  };

  return (
    <div>
      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Success!"
        description="Department has been updated successfully."
      />
      <nav className="breadcrumb">
        <span>Department &gt;</span> <span className="active">Edit Department</span>
      </nav>

      {/* Row: Department Name & Department Code */}
      <div className="department-row">
        <div className="department-full-width">
          <label className="department-input-label">Department Name *</label>
          <input
            type="text"
            className="department-input-field"
            placeholder="Enter department name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="department-full-width">
          <label className="department-input-label">Department Code</label>
          <input
            type="text"
            className="department-input-field"
            placeholder="Axz0345t"
          />
        </div>
      </div>

      {/* Row: Department Type & Head of Department */}
      <div className="department-row">
        <div className="department-full-width">
          <label className="department-input-label">Department Type</label>
          <select className="department-input-field">
            <option>Select an Option</option>
          </select>
        </div>
        <div className="department-full-width">
          <label className="department-input-label">Head of Department *</label>
          <input
            type="text"
            className="department-input-field"
            placeholder="Enter head name"
            name="head"
            value={formData.head}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="department-row">
        <div className="department-full-width">
          <label className="department-input-label">Parent Department</label>
          <select className="department-input-field">
            <option>Select an Option</option>
          </select>
        </div>
        <div className="department-full-width">
          <label className="department-input-label">No of Employees *</label>
          <input
            type="number"
            className="department-input-field"
            placeholder="Enter number of employees"
            name="employees"
            value={formData.employees}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      {/* Row: Email & Description */}
      <div className="department-row">
        <div className="department-full-width">
          <label className="department-input-label">Email Address *</label>
          <input
            type="email"
            className="department-input-field"
            placeholder="Enter email address"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="department-full-width">
          <label className="department-input-label">Department Description</label>
          <input
            type="text"
            className="department-input-field"
            placeholder="Add Description"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="department-button-group">
        <button className="department-btn department-cancel" onClick={() => navigate('/departments')}>
          Cancel
        </button>
        <button className="department-btn department-save" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditDepartment; 