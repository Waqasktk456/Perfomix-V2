import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import './NotificationBell.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // ... existing fetch functions ...

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        setShowDropdown(false);

        // Navigate to the Notifications page
        navigate('/notifications');
    };
    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.data.count);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/notifications?limit=10', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Handle response
                if (data.success && data.data) {
                    setNotifications(data.data);
                } else if (Array.isArray(data)) {
                    setNotifications(data);
                } else {
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: 1 } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:5000/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: 1 }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };



    // Toggle dropdown
    const toggleDropdown = () => {
        if (!showDropdown) {
            fetchNotifications();
        }
        setShowDropdown(!showDropdown);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch unread count on mount and periodically
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Format time ago
    const timeAgo = (timestamp) => {
        const now = new Date();
        const created = new Date(timestamp);
        const seconds = Math.floor((now - created) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return created.toLocaleDateString();
    };

    // Get priority badge
    const getPriorityBadge = (priority) => {
        const badges = {
            urgent: 'priority-urgent',
            high: 'priority-high',
            normal: 'priority-normal',
            low: 'priority-low'
        };
        return badges[priority] || 'priority-normal';
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button className="notification-bell-button" onClick={toggleDropdown}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading ? (
                            <div className="notification-loading">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">No notifications</div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityBadge(notification.priority)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-meta">
                                            <span className="notification-time">{timeAgo(notification.created_at)}</span>
                                            {notification.sender_name && (
                                                <span className="notification-sender">from {notification.sender_name}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!notification.is_read && <div className="unread-indicator"></div>}
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-footer">
                            <span
                                className="view-all-link"
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/notifications');
                                }}
                            >
                                View all notifications
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
