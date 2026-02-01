import React, { useState } from "react";
// import "./Notification.css";
import { FaEllipsisH } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import '../../styles/typography.css';
import { EyeIcon, ThreedotsIcon, Trashicon } from "../../assets";

const notificationsData = [
  {
    id: 1,
    category: "Today",
    user: "Jese Leos",
    message: 'New message from Jese Leos: "Hey, what’s up? All set for the presentation?"',
    time: "a few moments ago",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: 2,
    category: "Today",
    user: "Joseph Mcfall",
    message: "Joseph Mcfall and 5 others started following you",
    time: "a few moments ago",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    id: 3,
    category: "Today",
    user: "Bonnie Green",
    message: "Bonnie Green and 141 others love your story. See it and view more stories",
    time: "a few moments ago",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
  },
  {
    id: 4,
    category: "Yesterday",
    user: "Roberta Casas",
    message: 'Roberta Casas liked your comment: "Welcome to Flowbite community"',
    time: "a few moments ago",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    id: 5,
    category: "Yesterday",
    user: "Lana Byrd",
    message: "Lana Byrd tagged you in a photo",
    time: "a few moments ago",
    avatar: "https://randomuser.me/api/portraits/women/5.jpg",
  },
];

const LineManagerNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(notificationsData);
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const handleDeleteClick = (notif) => {
    setSelectedNotification(notif);
    setShowModal(true);
  };

  const confirmDelete = () => {
    setNotifications(notifications.filter((n) => n.id !== selectedNotification.id));
    setShowModal(false);
    setSelectedNotification(null);
  };

  return (
    <div className="notification-container">
      {/* Notification Header */}
     {/* Notification Header */}
<div className="notification-header">
  <div className="tabs">
    <span className="active">All</span>
  </div>
  <button className="compose-btn">
    Mark as Read
  </button>
</div>


      {/* Notification List */}
      <div className="notification-list">
        {["Today", "Yesterday"].map((category) => (
          <div key={category}>
            <h4 className="category-title">{category}</h4>
            {notifications
              .filter((n) => n.category === category)
              .map((notif) => (
                <div className="notification-card" key={notif.id}>
                  <img src={notif.avatar} alt="User" className="avatar" />
                  <div className="notification-content">
                    <p className="message">
                      <strong>{notif.user}</strong> {notif.message}
                    </p>
                    <span className="timestamp">{notif.time}</span>
                  </div>
                  <div className="options">
  <img 
    src={ThreedotsIcon} 
    alt="Options" 
    className="options-icon" 
  />
  <div className="dropdown-menu">
    <span className="view">
      <img src={EyeIcon} alt="View" className="action-icon" />
      View
    </span>
    <span className="delete" onClick={() => handleDeleteClick(notif)}>
      <img src={Trashicon} alt="Delete" className="action-icon" />
      Delete
    </span>
  </div>
</div>


                </div>
              ))}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showModal && (
      <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
        <h2>Are you sure you want to delete the notification?</h2>
        <p>This message will be removed from your messages.</p>
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

export default LineManagerNotifications;
