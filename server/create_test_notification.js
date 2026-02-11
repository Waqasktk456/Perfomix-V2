const db = require('./db');
// Removed service import to avoid potential errors
// const NotificationService = require('./services/notificationService');

async function createTestNotification() {
    try {
        // 1. Get ALL users
        const [users] = await db.execute(`
      SELECT id, first_name, last_name, role, organization_id, email 
      FROM employees 
      LIMIT 20
    `);

        if (users.length === 0) {
            console.log('No users found.');
            process.exit(0);
        }

        console.log(`Creating test notifications for ${users.length} users...`);

        for (const user of users) {
            const notification = {
                organization_id: user.organization_id || 1,
                recipient_id: user.id || 1,
                sender_id: null,
                notification_type: 'system_test',
                title: 'System Test Notification',
                message: `Hello ${user.first_name}, this is a test notification.`,
                metadata: JSON.stringify({ test: true }),
                action_url: '/notifications',
                priority: 'normal',
                is_read: 0,
                created_at: new Date()
            };

            await db.execute(`
          INSERT INTO notifications 
          (organization_id, recipient_id, sender_id, notification_type, title, message, metadata, action_url, priority, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                notification.organization_id,
                notification.recipient_id,
                notification.sender_id,
                notification.notification_type,
                notification.title,
                notification.message,
                notification.metadata,
                notification.action_url,
                notification.priority,
                notification.is_read,
                notification.created_at
            ]);
            console.log(`Sent to: ${user.first_name} (${user.role})`);
        }

        console.log('Test notifications created for everyone!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

createTestNotification();
