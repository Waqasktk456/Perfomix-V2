import React, { useState } from 'react';
import './SettingsLayout.css';
import ProfileSettings from './ProfileSettings';
import ChangePassword from "../../screens/Admin Settings/change-password";

const sections = [
  { key: 'profile', label: 'Public profile' },
  { key: 'password', label: 'Change password' } // Added change password option
];

const SettingsLayout = () => {
  const [activeSection, setActiveSection] = useState('profile');

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings />;
      case 'password':
        return <ChangePassword />; // Render ChangePassword component
      default:
        return <div style={{ padding: 32 }}>Coming soon...</div>;
    }
  };

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <h2 className="settings-title">Settings</h2>
        <ul className="settings-nav">
          {sections.map((section) => (
            <li
              key={section.key}
              className={activeSection === section.key ? 'active' : ''}
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </li>
          ))}
        </ul>
      </aside>
      <main className="settings-content">
        {renderSection()}
      </main>
    </div>
  );
};

export default SettingsLayout;