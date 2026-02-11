import React, { useState, useEffect } from "react";
import "./Notification.css";
import { FaEllipsisH } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import '../../styles/typography.css';
import { EyeIcon, ThreedotsIcon, Trashicon } from "../../assets";

const Notification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setNotifications(notifications.map(n =>
        n.id === notification.id ? { ...n, is_read: 1 } : n
      ));

      setNotifications(notifications.map(n =>
        n.id === notification.id ? { ...n, is_read: 1 } : n
      ));

      // Navigate if action URL exists
      if (notification.action_url) {
        let url = notification.action_url;
        // Fix legacy broken URLs
        if (url.includes('/line-manager/evaluations') || url.includes('/linemanager-evaluation')) {
          url = '/performance-evaluation';
        }
        if (url.includes('/evaluations?cycle=')) {
          url = '/performance-evaluation';
        }
        navigate(url);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDeleteClick = (notif) => {
    setSelectedNotification(notif);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${selectedNotification.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setNotifications(notifications.filter((n) => n.id !== selectedNotification.id));
      setShowModal(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const date = new Date(notif.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let category = "Older";
    if (date.toDateString() === today.toDateString()) {
      category = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      category = "Yesterday";
    }

    if (!acc[category]) acc[category] = [];
    acc[category].push(notif);
    return acc;
  }, { Today: [], Yesterday: [], Older: [] });

  // Format time ago
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'System')}&background=random`;
  };

  return (
    <div className="notification-container">
      {/* Notification Header */}
      <div className="notification-header">
        <div className="tabs">
          <span
            className={activeTab === "All" ? "active" : ""}
            onClick={() => setActiveTab("All")}
          >
            All
          </span>
          <span
            className={activeTab === "Unread" ? "active" : ""}
            onClick={() => setActiveTab("Unread")}
          >
            Unread
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading notifications...</div>
      ) : (
        /* Notification List */
        <div className="notification-list">
          {Object.entries(groupedNotifications).map(([category, items]) => (
            items.length > 0 && (activeTab === "All" || items.some(n => !n.is_read)) && (
              <div key={category}>
                <h4 className="category-title">{category}</h4>
                {items
                  .filter(n => activeTab === "All" || !n.is_read)
                  .map((notif) => (
                    <div
                      className={`notification-card ${!notif.is_read ? 'unread' : ''}`}
                      key={notif.id}
                    >
                      <img
                        src={getAvatar(notif.sender_name || 'System')}
                        alt="User"
                        className="avatar"
                      />
                      <div className="notification-content" onClick={() => markAsRead(notif)}>
                        <p className="message">
                          <strong>{notif.title}</strong>
                          <br />
                          {notif.message}
                        </p>
                        <span className="timestamp">{timeAgo(notif.created_at)}</span>
                      </div>
                      <div className="options">
                        <img
                          src={ThreedotsIcon}
                          alt="Options"
                          className="options-icon"
                        />
                        {/* View option removed as per request */}
                        <div className="dropdown-menu">
                          <span className="delete" onClick={() => handleDeleteClick(notif)}>
                            <img src={Trashicon} alt="Delete" className="action-icon" />
                            Delete
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )
          ))}
          {notifications.length === 0 && (
            <div className="empty-state">No notifications to display</div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            <h2>Delete Notification?</h2>
            <p>This notification will be permanently removed.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="delete-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
