const db = require('../db');

const NotificationModel = {
  // Create a new notification
  create: async (notificationData) => {
    const {
      organization_id,
      recipient_id,
      sender_id,
      notification_type,
      title,
      message,
      metadata,
      action_url,
      priority = 'normal'
    } = notificationData;

    const query = `
      INSERT INTO notifications 
        (organization_id, recipient_id, sender_id, notification_type, title, message, metadata, action_url, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      organization_id,
      recipient_id,
      sender_id,
      notification_type,
      title,
      message,
      JSON.stringify(metadata),
      action_url,
      priority
    ]);

    return result.insertId;
  },

  // Create multiple notifications at once
  createBulk: async (notifications) => {
    if (!notifications || notifications.length === 0) return [];

    const values = notifications.map(n => [
      n.organization_id,
      n.recipient_id,
      n.sender_id || null,
      n.notification_type,
      n.title,
      n.message,
      JSON.stringify(n.metadata || {}),
      n.action_url || null,
      n.priority || 'normal'
    ]);

    const placeholders = notifications.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const query = `
      INSERT INTO notifications 
        (organization_id, recipient_id, sender_id, notification_type, title, message, metadata, action_url, priority)
      VALUES ${placeholders}
    `;

    const flatValues = values.flat();
    const [result] = await db.execute(query, flatValues);
    return result;
  },

  // Get all notifications for a user
  getByRecipient: async (recipient_id, filters = {}) => {
    let query = `
      SELECT 
        n.*,
        sender.first_name AS sender_first_name,
        sender.last_name AS sender_last_name
      FROM notifications n
      LEFT JOIN employees sender ON n.sender_id = sender.id
      WHERE n.recipient_id = ?
    `;

    const params = [recipient_id];

    if (filters.is_read !== undefined) {
      query += ` AND n.is_read = ?`;
      params.push(filters.is_read);
    }

    if (filters.notification_type) {
      query += ` AND n.notification_type = ?`;
      params.push(filters.notification_type);
    }

    query += ` ORDER BY n.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(filters.limit));
    }

    const [rows] = await db.execute(query, params);

    // Parse metadata JSON safely
    return rows.map(row => {
      let metadata = row.metadata;

      // Check if metadata is a string, then parse it
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Failed to parse metadata JSON:', e);
          metadata = null;
        }
      }
      // If it's already an object, use it as is

      return {
        ...row,
        metadata,
        sender_name: row.sender_first_name && row.sender_last_name
          ? `${row.sender_first_name} ${row.sender_last_name}`
          : null
      };
    });
  },

  // Get unread count
  getUnreadCount: async (recipient_id) => {
    const query = `
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE recipient_id = ? AND is_read = 0
    `;

    const [rows] = await db.execute(query, [recipient_id]);
    return rows[0].count;
  },

  // Mark notification as read
  markAsRead: async (notificationId, recipient_id) => {
    const query = `
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_id = ?
    `;

    const [result] = await db.execute(query, [notificationId, recipient_id]);
    return result.affectedRows > 0;
  },

  // Mark all notifications as read
  markAllAsRead: async (recipient_id) => {
    const query = `
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE recipient_id = ? AND is_read = 0
    `;

    const [result] = await db.execute(query, [recipient_id]);
    return result.affectedRows;
  },

  // Delete notification
  delete: async (notificationId, recipient_id) => {
    const query = `DELETE FROM notifications WHERE id = ? AND recipient_id = ?`;
    const [result] = await db.execute(query, [notificationId, recipient_id]);
    return result.affectedRows > 0;
  },

  // Delete old read notifications (cleanup)
  deleteOldRead: async (daysOld = 30) => {
    const query = `
      DELETE FROM notifications 
      WHERE is_read = 1 
        AND read_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const [result] = await db.execute(query, [daysOld]);
    return result.affectedRows;
  },

  // Get notification by ID
  getById: async (notificationId, recipient_id) => {
    const query = `
      SELECT 
        n.*,
        sender.first_name AS sender_first_name,
        sender.last_name AS sender_last_name
      FROM notifications n
      LEFT JOIN employees sender ON n.sender_id = sender.id
      WHERE n.id = ? AND n.recipient_id = ?
    `;

    const [rows] = await db.execute(query, [notificationId, recipient_id]);

    if (rows.length === 0) return null;

    const notification = rows[0];
    let metadata = notification.metadata;

    // Check if metadata is a string, then parse it
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error('Failed to parse metadata JSON:', e);
        metadata = null;
      }
    }

    return {
      ...notification,
      metadata,
      sender_name: notification.sender_first_name && notification.sender_last_name
        ? `${notification.sender_first_name} ${notification.sender_last_name}`
        : null
    };
  }
};

module.exports = NotificationModel;
