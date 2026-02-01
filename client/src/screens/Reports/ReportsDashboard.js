import React from 'react';
import AdminReports from './AdminReports';
import LineManagerReports from './LineManagerReports';
import StaffDashboard from '../../Staff/screens/StaffDashboard/staff-dashboard'; // Reusing staff dashboard for self-report
import { Navigate } from 'react-router-dom';

const ReportsDashboard = () => {
    const role = localStorage.getItem('userRole');

    if (!role) return <Navigate to="/login" />;

    const lowerRole = role.toLowerCase();

    if (lowerRole === 'admin' || lowerRole === 'super_admin') {
        return <AdminReports />;
    } else if (lowerRole === 'line-manager') {
        return <LineManagerReports />;
    } else {
        return <StaffDashboard />;
    }
};

export default ReportsDashboard;
