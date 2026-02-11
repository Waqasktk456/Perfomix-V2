const NotificationModel = require('../models/notificationModel');
const NotificationService = require('../services/notificationService');

const NotificationController = {
    // Get all notifications for logged-in user
    getNotifications: async (req, res) => {
        try {
            const employee_id = req.user.id;
            const { is_read, limit, notification_type } = req.query;

            const filters = {};
            if (is_read !== undefined) filters.is_read = is_read === 'true' ? 1 : 0;
            if (limit) filters.limit = limit;
            if (notification_type) filters.notification_type = notification_type;

            const notifications = await NotificationModel.getByRecipient(employee_id, filters);

            res.status(200).json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }
    },

    // Get unread count
    getUnreadCount: async (req, res) => {
        try {
            const employee_id = req.user.id;
            const count = await NotificationModel.getUnreadCount(employee_id);

            res.status(200).json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch unread count',
                error: error.message
            });
        }
    },

    // Mark notification as read
    markAsRead: async (req, res) => {
        try {
            const employee_id = req.user.id;
            const { id } = req.params;

            const success = await NotificationModel.markAsRead(id, employee_id);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }
    },

    // Mark all as read
    markAllAsRead: async (req, res) => {
        try {
            const employee_id = req.user.id;
            const affectedRows = await NotificationModel.markAllAsRead(employee_id);

            res.status(200).json({
                success: true,
                message: `${affectedRows} notification(s) marked as read`
            });
        } catch (error) {
            console.error('Error marking all as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: error.message
            });
        }
    },

    // Delete notification
    deleteNotification: async (req, res) => {
        try {
            const employee_id = req.user.id;
            const { id } = req.params;

            const success = await NotificationModel.delete(id, employee_id);

            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: error.message
            });
        }
    },

    // Send manual reminder (Admin only)
    sendManualReminder: async (req, res) => {
        try {
            const admin_id = req.user.id;
            const organizationId = req.user.organizationId;
            const { line_manager_ids, message_text, cycle_name, cycle_id } = req.body;

            // Validate input
            if (!line_manager_ids || !Array.isArray(line_manager_ids) || line_manager_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'line_manager_ids array is required'
                });
            }

            if (!message_text || !cycle_name || !cycle_id) {
                return res.status(400).json({
                    success: false,
                    message: 'message_text, cycle_name, and cycle_id are required'
                });
            }

            await NotificationService.sendAdminManualReminder({
                organization_id: organizationId,
                line_manager_ids,
                admin_id,
                message_text,
                cycle_name,
                cycle_id
            });

            res.status(200).json({
                success: true,
                message: `Reminder sent to ${line_manager_ids.length} line manager(s)`
            });
        } catch (error) {
            console.error('Error sending manual reminder:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send reminder',
                error: error.message
            });
        }
    },

    // Get notification by ID
    getNotificationById: async (req, res) => {
        try {
            const employee_id = req.user.employee_id;
            const { id } = req.params;

            const notification = await NotificationModel.getById(id, employee_id);

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            // Mark as read when viewed
            await NotificationModel.markAsRead(id, employee_id);

            res.status(200).json({
                success: true,
                data: notification
            });
        } catch (error) {
            console.error('Error fetching notification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notification',
                error: error.message
            });
        }
    }
};

module.exports = NotificationController;
