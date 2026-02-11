const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all notifications for logged-in user
router.get('/', NotificationController.getNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Get notification by ID
router.get('/:id', NotificationController.getNotificationById);

// Mark notification as read
router.put('/:id/read', NotificationController.markAsRead);

// Mark all as read
router.put('/mark-all-read', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:id', NotificationController.deleteNotification);

// Send manual reminder (Admin only)
router.post('/send-reminder', NotificationController.sendManualReminder);

module.exports = router;
