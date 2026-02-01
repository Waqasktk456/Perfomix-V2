import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "./screens/LandingPage/LandingPage";
import SignupScreen from "./screens/signUp/signUpScreen";
import LoginScreen from "./screens/Login/LoginScreen";
import ForgotPasswordScreen from "./screens/ForgotPassword/ForgotPassword";
import OrganizationSelectionScreen from "./screens/OrganizationSelection/OrganizationSelectionScreen";
import ProfileSetup from "./screens/ProfileSetup/ProfileSetup";
import Dashboard from "./screens/Dashboard/Dashboard";
import Layout from "./components/Layout";
import Notifications from "./screens/Notification/Notification";
import Teams from "./screens/Teams/Teams";
import ComposeNotification from "./screens/Notification/ComposeNotification";
import AddDepartment from "./screens/Departments/AddDepartment";
import Employees from "./screens/Employees/Employees";
import SetPassword from "./screens/Employees/SetPassword";
import ViewMatrix from "./screens/PerformanceMatrix/ViewMatrix";
import LineManagerEvaluationScreen from "./screens/LineManagerEvaluation/LineManagerEvaluation";
import EvaluateLineManager from "./screens/LineManagerEvaluation/EvaluateLineManager";
import Organization from "./screens/Organizations/organization";
import AddOrganization from "./screens/Organizations/add-organization";
import Departments from "./screens/Departments/Departments";
import PerformanceMatrices from "./screens/PerformanceMatrix/PerformanceMatrix";
import CreateMatrix from "./screens/PerformanceMatrix/CreateMatrix";
import AddParameters from "./screens/PerformanceMatrix/AddParameters";
import CreateCycle from "./screens/Evalution Cycle/Createcycle";
import Cycle from "./screens/Evalution Cycle/Cycles";
import Cycleassingment from "./screens/Evalution Cycle/Cycleassingment"
import AdminProfile from "./screens/Admin Settings/admin-profile";
import AdminEditProfile from "./screens/Admin Settings/admin-editprofile";
import ChangePassword from "./screens/Admin Settings/change-password";
import LineManagerDashboard from "./LineManager/screens/Dashboard/linemanager-dashboard";
import LineManagerPerformance from './LineManager/screens/linemanager-performance';
import TeamPerformance from "./LineManager/screens/TeamPerformance";
import EmployeePerformanceReport from "./screens/Performance Report/performance-report";
import ViewPerformanceReport from "./screens/Performance Report/view-performance-report";
import ViewProfile from "./screens/Performance Report/view-profile";
import PerformanceEvaluation from "./LineManager/screens/performance-evaluation";
import ParameterName from "./LineManager/screens/parameter-name";
import EvaluateEmployee from "./LineManager/screens/evaluate-employee";
import EvaluateEmployeeAll from "./LineManager/screens/evaluate-employee-all";
import EmployeeViewProfile from "./LineManager/screens/employee-viewprofile";
import AddEmployees from "./screens/Employees/AddEmployees";
import StaffDashboard from "./Staff/screens/StaffDashboard/staff-dashboard";
import ViewOrganization from "./screens/Organizations/view-organization";
import EmployeeView from "./screens/Employees/EmployeeView";
import ViewParameters from "./screens/PerformanceMatrix/view-parameters";
import LogoutScreen from "./screens/Logout";
import LineManagerNotifications from "./LineManager/screens/linemanager-notifications";
import WelcomeScreen from "./screens/welcome-screen";
import EditDepartment from "./screens/Departments/EditDepartment";
import DepartmentDetails from './screens/Departments/DepartmentDetails';
import EmployeeDetails from "./screens/Employees/EmployeeDetails";
import Addteam from './screens/Teams/Addteam';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SettingsLayout from "./components/Settings/SettingsLayout";
import TemplateGallery from './screens/PerformanceMatrix/TemplateGallery';
import CustomizeTemplate from './screens/PerformanceMatrix/CustomizeTemplate';
import ReportsDashboard from './screens/Reports/ReportsDashboard';
import IndividualReport from './screens/Reports/IndividualReport';

const GOOGLE_CLIENT_ID = "503974493857-fhask4hgvn8kblqr86jatec0didn89ja.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          {/* Default Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Pages */}
          <Route path="/landing-page" element={<LandingPage />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/organization-selection" element={<OrganizationSelectionScreen />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/welcome-screen" element={<WelcomeScreen />} />

          {/* Add Organization without Layout */}
          <Route path="/add-organization" element={<AddOrganization />} />

          {/* Protected Routes Inside Layout */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="view-profile" element={<ViewProfile />} />
            <Route path="linemanager-notification" element={<LineManagerNotifications />} />
            <Route path="notification/compose" element={<ComposeNotification />} />
            <Route path="departments" element={<Departments />} />
            <Route path="add-department" element={<AddDepartment />} />
            <Route path="add-team" element={<Addteam />} />
            <Route path="add-team/:id" element={<Addteam />} />
            <Route path="edit-department/:departmentName" element={<EditDepartment />} />
            <Route path="employees" element={<Employees />} />
            <Route path="add-employee" element={<AddEmployees />} />
            <Route path="employees/edit/:Employee_id" element={<AddEmployees />} />
            <Route path="employees/details/:Employee_id" element={<EmployeeDetails />} />
            <Route path="performance-matrix" element={<PerformanceMatrices />} />
            <Route path="create-matrix" element={<CreateMatrix />} />
            <Route path="add-parameters" element={<AddParameters />} />
            <Route path="evaluation-cycle" element={<Cycle />} />
            <Route path="create-cycle" element={<CreateCycle />} />
            <Route path="cycle-assingment" element={<Cycleassingment />} />
            <Route path="admin-profile" element={<SettingsLayout />} />
            <Route path="linemanager-setting" element={<SettingsLayout />} />
            <Route path="staff-setting" element={<SettingsLayout />} />
            <Route path="linemanager-profile" element={<SettingsLayout />} />
            <Route path="admin-edit-profile" element={<AdminEditProfile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="linemanager-dashboard" element={<LineManagerDashboard />} />
            <Route path="linemanager-performance" element={<LineManagerPerformance />} />
            <Route path="performance-report" element={<EmployeePerformanceReport />} />
            <Route path="view-performance-report" element={<ViewPerformanceReport />} />
            <Route path="team-performance" element={<TeamPerformance />} />
            <Route path="performance-evaluation" element={<PerformanceEvaluation />} />
            <Route path="linemanager-evaluation" element={<LineManagerEvaluationScreen />} />
            <Route path="evaluate-linemanager/:id" element={<EvaluateLineManager />} />
            <Route path="parameter-name" element={<ParameterName />} />
            <Route path="evaluate-employee" element={<EvaluateEmployee />} />
            <Route path="evaluate-employee-all" element={<EvaluateEmployeeAll />} />
            <Route path="template-gallery" element={<TemplateGallery />} />
            <Route path="customize-template" element={<CustomizeTemplate />} />
            <Route path="organization" element={<Organization />} />
            <Route path="organization/edit/:id" element={<AddOrganization />} />
            <Route path="view-organization" element={<ViewOrganization />} />
            <Route path="view-parameters" element={<ViewParameters />} />
            <Route path="staff-dashboard" element={<StaffDashboard />} />
            <Route path="logout" element={<LogoutScreen />} />
            <Route path="department-details" element={<DepartmentDetails />} />
            <Route path="view-matrix" element={<ViewMatrix />} />
            <Route path="teams" element={<Teams />} />

            <Route path="set-password" element={<SetPassword />} />

          </Route>
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </GoogleOAuthProvider>
  );
}

export default App;