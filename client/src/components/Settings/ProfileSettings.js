import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import profilePic from '../../assets/images/profile.png';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole')?.toLowerCase();
  const fileInputRef = useRef();
  console.log('ProfileSettings: userId', userId, 'userRole', userRole); // Debug log

  useEffect(() => {
    if (userRole === 'admin' && userId) {
      fetchAdminUser();
    } else if (userId) {
      fetchEmployeeUser();
    }
  }, [userId, userRole]);

  if (userRole !== 'admin' && !userId) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '2rem' }}>Access denied: Admins only.</div>;
  }

  const fetchAdminUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = res.data.data || {};
      const [First_name, ...lastArr] = (userData.name || '').split(' ');
      const Last_name = lastArr.join(' ');
      setUser(userData);
      setForm({
        ...userData,
        First_name,
        Last_name,
      });
      setImagePreview(userData.picture || null);
      if (userData.picture) {
        localStorage.setItem('userPicture', userData.picture);
        window.dispatchEvent(new Event('profileUpdate'));
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5000/api/employees/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data.data;
      if (!data) return;

      const normalizedData = {
        ...data,
        First_name: data.first_name,
        Last_name: data.last_name,
        Email: data.email,
        Primary_contact_number: data.primary_contact_number,
        Department_name: data.department_name,
        Marital_status: data.marital_status,
        Date_of_birth: data.date_of_birth,
        Permanent_address: data.permanent_address,
        Profile_image: data.profile_image
      };
      setUser(normalizedData);
      setForm(normalizedData);
      setImagePreview(normalizedData.Profile_image || null);
      if (normalizedData.Profile_image) {
        localStorage.setItem('userPicture', normalizedData.Profile_image);
        window.dispatchEvent(new Event('profileUpdate'));
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(userRole === 'admin' && name === 'First_name'
        ? { name: value + ' ' + (prev.Last_name || '') }
        : {}),
      ...(userRole === 'admin' && name === 'Last_name'
        ? { name: (prev.First_name || '') + ' ' + value }
        : {}),
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setEditMode(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/employees/${userId}/profile-image`);
      setImagePreview(null);
      setForm((prev) => ({ ...prev, Profile_image: null }));
      // Optionally update localStorage/context here
    } catch (err) {
      toast.error('Failed to delete profile picture');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      if (userRole === 'admin') {
        const name = (form.First_name || '') + ' ' + (form.Last_name || '');
        formData.append('name', name);
        formData.append('email', form.email);
        if (selectedFile) {
          formData.append('picture', selectedFile);
        } else {
          formData.append('picture', form.picture || '');
        }

        const token = localStorage.getItem('token');
        const res = await axios.put(`http://localhost:5000/api/users/${userId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.data.picture) {
          localStorage.setItem('userPicture', res.data.picture);
          window.dispatchEvent(new Event('profileUpdate'));
        }

        setEditMode(false);
        setSelectedFile(null);
        fetchAdminUser();
      } else {
        // Format Date_of_birth and Joining_date to YYYY-MM-DD
        const formToSend = { ...form };
        if (formToSend.Date_of_birth && formToSend.Date_of_birth.includes('T')) {
          formToSend.Date_of_birth = formToSend.Date_of_birth.split('T')[0];
        }
        if (formToSend.Joining_date && formToSend.Joining_date.includes('T')) {
          formToSend.Joining_date = formToSend.Joining_date.split('T')[0];
        }

        // Add all fields to FormData
        Object.keys(formToSend).forEach(key => {
          if (formToSend[key] !== null && formToSend[key] !== undefined) {
            formData.append(key, formToSend[key]);
          }
        });

        if (selectedFile) {
          formData.append('Profile_image', selectedFile);
        }

        const token = localStorage.getItem('token');
        const res = await axios.put(`http://localhost:5000/api/employees/${userId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.data.data && res.data.data.Profile_image) {
          localStorage.setItem('userPicture', res.data.data.Profile_image);
          window.dispatchEvent(new Event('profileUpdate'));
        }

        setEditMode(false);
        setSelectedFile(null);
        fetchEmployeeUser();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="profile-settings-card">
      <div className="profile-settings-avatar-section">
        <img
          src={
            (imagePreview?.startsWith('/uploads') ? `http://localhost:5000${imagePreview}` : imagePreview) ||
            (user.Profile_image?.startsWith('/uploads') ? `http://localhost:5000${user.Profile_image}` :
              user.picture?.startsWith('/uploads') ? `http://localhost:5000${user.picture}` :
                user.Profile_image || user.picture || profilePic)
          }
          alt="Profile"
          className="profile-settings-avatar"
          onClick={() => { if (editMode) fileInputRef.current.click(); }}
          style={{ cursor: editMode ? 'pointer' : 'default' }}
        />
        <div className="profile-settings-avatar-actions">
          {editMode && (
            <>
              <button type="button" className="profile-settings-btn primary" onClick={() => fileInputRef.current.click()}>Change picture</button>
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImageChange} />
              <button type="button" className="profile-settings-btn" onClick={handleDeleteImage}>Delete picture</button>
            </>
          )}
        </div>
      </div>
      <form className="profile-settings-form" onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div className="profile-settings-row">
          <div className="profile-settings-field">
            <label>First name</label>
            <input name="First_name" value={form.First_name || ''} onChange={handleChange} disabled={userRole !== 'admin' ? true : !editMode} />
          </div>
          <div className="profile-settings-field">
            <label>Last name</label>
            <input name="Last_name" value={form.Last_name || ''} onChange={handleChange} disabled={userRole !== 'admin' ? true : !editMode} />
          </div>
        </div>
        <div className="profile-settings-field">
          <label>Email</label>
          <input name="email" value={userRole === 'admin' ? (form.email || '') : (form.Email || '')} onChange={handleChange} disabled={true} title="Email cannot be changed" />
        </div>
        {userRole !== 'admin' && (
          <div className="profile-settings-field">
            <label>Department</label>
            <input name="Department" value={form.Department_name || ''} disabled />
          </div>
        )}
        <div className="profile-settings-actions">
          {!editMode ? (
            <button type="button" className="profile-settings-btn primary" onClick={() => setEditMode(true)}>Edit</button>
          ) : (
            <>
              <button type="button" className="profile-settings-btn" onClick={() => setEditMode(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="profile-settings-btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings; 