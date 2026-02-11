const cron = require('node-cron');
const db = require('../db');
const NotificationService = require('../services/notificationService');

/**
 * Cron job to send automatic deadline reminders
 * Runs every day at 9:00 AM
 * Sends reminders for cycles with deadlines in 7, 3, or 1 days
 */
const scheduleDeadlineReminders = () => {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running deadline reminder cron job...`);

        try {
            // Get all active cycles
            const [activeCycles] = await db.execute(`
        SELECT 
          id,
          cycle_name,
          end_date,
          organization_id,
          DATEDIFF(end_date, CURDATE()) as days_remaining
        FROM evaluation_cycles
        WHERE status = 'active'
          AND end_date >= CURDATE()
          AND DATEDIFF(end_date, CURDATE()) IN (7, 3, 1)
      `);

            console.log(`Found ${activeCycles.length} cycles needing reminders`);

            for (const cycle of activeCycles) {
                const { id: cycle_id, cycle_name, end_date, organization_id, days_remaining } = cycle;

                // Get line managers with pending evaluations for this cycle
                const [assignments] = await db.execute(`
          SELECT 
            cta.line_manager_id,
            COUNT(DISTINCT e.id) as pending_count
          FROM cycle_team_assignments cta
          LEFT JOIN evaluations e ON e.cycle_team_assignment_id = cta.id
            AND e.status IN ('draft', 'pending_review')
          WHERE cta.cycle_id = ?
          GROUP BY cta.line_manager_id
          HAVING pending_count > 0
        `, [cycle_id]);

                if (assignments.length === 0) {
                    console.log(`  No pending evaluations for cycle: ${cycle_name}`);
                    continue;
                }

                const line_manager_ids = assignments.map(a => a.line_manager_id);
                const pending_counts = assignments.reduce((acc, a) => {
                    acc[a.line_manager_id] = a.pending_count;
                    return acc;
                }, {});

                console.log(`  Sending reminders to ${line_manager_ids.length} line managers for cycle: ${cycle_name} (${days_remaining} day(s) remaining)`);

                // Send individual reminders with specific pending counts
                for (const manager_id of line_manager_ids) {
                    await NotificationService.sendDeadlineReminder({
                        organization_id,
                        line_manager_ids: [manager_id],
                        cycle_name,
                        cycle_id,
                        deadline: end_date,
                        days_remaining,
                        pending_count: pending_counts[manager_id]
                    });
                }
            }

            console.log('Deadline reminder cron job completed successfully');
        } catch (error) {
            console.error('Error in deadline reminder cron job:', error);
        }
    });

    console.log('Deadline reminder cron job scheduled (runs daily at 9:00 AM)');
};

module.exports = scheduleDeadlineReminders;
