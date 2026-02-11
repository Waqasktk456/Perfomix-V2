const db = require('./db');

async function createAdminNotification() {
    try {
        // Try to find an admin or user with ID 1
        const [users] = await db.execute(`
      SELECT id, first_name, last_name, role 
      FROM employees 
      WHERE id = 1 OR role LIKE '%admin%' OR role LIKE '%manager%'
      LIMIT 5
    `);

        console.log('Found potential admin/manager users:', users);

        for (const user of users) {
            console.log(`Sending to ${user.first_name} (ID: ${user.id})`);
            await db.execute(`
        INSERT INTO notifications 
        (organization_id, recipient_id, sender_id, notification_type, title, message, metadata, action_url, priority, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
                user.organization_id || 1,
                user.id,
                null,
                'system_test',
                'Admin Test Notification',
                `Test notification for ${user.first_name}`,
                JSON.stringify({ test: true }),
                '/notifications',
                'high',
                0
            ]);
        }

        if (users.length === 0) {
            // Force insert for ID 1
            console.log('No admin found, forcing insert for ID 1');
            try {
                await db.execute(`
                INSERT INTO notifications 
                (organization_id, recipient_id, sender_id, notification_type, title, message, metadata, action_url, priority, is_read, created_at)
                VALUES (1, 1, null, 'system_test', 'Force ID 1 Test', 'Forced test for ID 1', '{}', '/notifications', 'high', 0, NOW())
            `);
            } catch (e) { console.log('Force insert failed:', e.message); }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

createAdminNotification();
