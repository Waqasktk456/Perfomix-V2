import React from "react";
import "./ComposeNotification.css";

const NotificationForm = () => {
  return (
    <div>
      <nav className="breadcrumb">
        <span>Notification &gt;</span> <span className="active">Create</span>
      </nav>

      {/* Row: Notification Title & Recipient */}
      <div className="row">
        <div className="full-width">
          <label className="input-label">Notification Title</label>
          <input
            type="text"
            className="input-field"
            placeholder="AhmadAli345@gmail.com"
          />
        </div>
        <div className="full-width">
          <label className="input-label">Recipient</label>
          <select className="input-field">
            <option>Select an Option</option>
          </select>
        </div>
      </div>

      {/* Message Field */}
      <div className="full-width">
        <label className="input-label">Message</label>
        <textarea
          className="input-field"
          placeholder="AhmadAli345@gmail.com"
        ></textarea>
      </div>

      {/* Buttons - Right Aligned */}
      <div className="button-group">
        <button className="btn draft">Save as Draft</button>
        <button className="btn send">Send</button>
      </div>
    </div>
  );
};

export default NotificationForm;
