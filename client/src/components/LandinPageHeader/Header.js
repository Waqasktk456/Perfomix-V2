import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../../assets/images/logo.png';
import { AdminIcon, StaffIcon } from '../../assets';



const Header = () => {
    const navigate = useNavigate();

    return (
        <header className="custom-header">
            <div className="custom-logo">
                <img src={logo} alt="Performix Logo" className="custom-logo-img" />
            </div>
            <div className="custom-roles">
            <button 
    className="custom-role-btn admin-btn"
    onClick={() => navigate('/login')}
>
    <img src={AdminIcon} alt="Admin Icon" className="role-icon" />
    Admin
</button>
<button 
    className="custom-role-btn manager-btn"
    onClick={() => navigate('/login')}
>
    <img src={AdminIcon} alt="Manager Icon" className="role-icon" />
    Line Manager
</button>
<button 
    className="custom-role-btn staff-btn"
    onClick={() => navigate('/login')}
>
    <img src={StaffIcon} alt="Staff Icon" className="role-icon" />
    Staff
</button>

            </div>
        </header>
    );
};

export default Header;
