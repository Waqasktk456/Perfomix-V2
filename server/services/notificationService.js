const NotificationModel = require('../models/notificationModel');

const NotificationService = {
    /**
     * Send Team Assignment Notification
     * Triggered when Admin activates cycle and assigns team to Line Manager
     */
    sendTeamAssignmentNotification: async ({
        organization_id,
        line_manager_id,
        cycle_id,
        cycle_name,
        team_name,
        employee_count,
        deadline,
        admin_id
    }) => {
        const notification = {
            organization_id,
            recipient_id: line_manager_id,
            sender_id: admin_id,
            notification_type: 'team_assignment',
            title: `New Team Assigned: ${cycle_name}`,
            message: `You have been assigned to evaluate ${team_name} (${employee_count} employees) for the ${cycle_name} cycle. Deadline: ${new Date(deadline).toLocaleDateString()}`,
            metadata: {
                cycle_id,
                cycle_name,
                team_name,
                employee_count,
                deadline
            },
            action_url: `/performance-evaluation`,
            priority: 'high'
        };

        return await NotificationModel.create(notification);
    },

    /**
     * Send Evaluation Submitted Notification
     * Triggered when Line Manager submits final evaluation
     */
    sendEvaluationSubmittedNotification: async ({
        organization_id,
        staff_id,
        line_manager_id,
        cycle_name,
        overall_score,
        feedback_summary,
        evaluation_id
    }) => {
        const notification = {
            organization_id,
            recipient_id: staff_id,
            sender_id: line_manager_id,
            notification_type: 'evaluation_submitted',
            title: `Your Evaluation for ${cycle_name} is Complete`,
            message: `Your performance evaluation has been submitted. Overall Score: ${overall_score || 'N/A'}. ${feedback_summary || 'Click to view details.'}`,
            metadata: {
                cycle_name,
                overall_score,
                evaluation_id
            },
            action_url: `/view-performance-report`,
            priority: 'high'
        };

        return await NotificationModel.create(notification);
    },

    /**
     * Send Line Manager Completion Notification
     * Triggered when Line Manager completes all assigned evaluations
     */
    sendManagerCompletionNotification: async ({
        organization_id,
        admin_ids,
        line_manager_id,
        line_manager_name,
        evaluations_count,
        cycle_name,
        cycle_id
    }) => {
        const notifications = admin_ids.map(admin_id => ({
            organization_id,
            recipient_id: admin_id,
            sender_id: line_manager_id,
            notification_type: 'manager_completion',
            title: `Evaluations Completed by ${line_manager_name}`,
            message: `${line_manager_name} has completed all ${evaluations_count} evaluations for ${cycle_name}.`,
            metadata: {
                line_manager_id,
                line_manager_name,
                evaluations_count,
                cycle_name,
                cycle_id
            },
            action_url: `/evaluation-cycle`,
            priority: 'normal'
        }));

        return await NotificationModel.createBulk(notifications);
    },

    /**
     * Send Admin Manual Reminder
     * Triggered when Admin manually sends reminder
     */
    sendAdminManualReminder: async ({
        organization_id,
        line_manager_ids,
        admin_id,
        message_text,
        cycle_name,
        cycle_id
    }) => {
        const notifications = line_manager_ids.map(manager_id => ({
            organization_id,
            recipient_id: manager_id,
            sender_id: admin_id,
            notification_type: 'admin_reminder',
            title: `Reminder: ${cycle_name}`,
            message: message_text,
            metadata: {
                cycle_name,
                cycle_id
            },
            action_url: `/performance-evaluation`,
            priority: 'high'
        }));

        return await NotificationModel.createBulk(notifications);
    },

    /**
     * Send Automatic Deadline Reminder
     * Triggered by cron job (7, 3, 1 days before deadline)
     */
    sendDeadlineReminder: async ({
        organization_id,
        line_manager_ids,
        cycle_name,
        cycle_id,
        deadline,
        days_remaining,
        pending_count
    }) => {
        const urgency = days_remaining === 1 ? 'urgent' : days_remaining === 3 ? 'high' : 'normal';
        const urgencyText = days_remaining === 1 ? 'URGENT: ' : '';

        const notifications = line_manager_ids.map(manager_id => ({
            organization_id,
            recipient_id: manager_id,
            sender_id: null,
            notification_type: 'deadline_reminder',
            title: `${urgencyText}${days_remaining} Day${days_remaining > 1 ? 's' : ''} Until ${cycle_name} Deadline`,
            message: `You have ${pending_count} pending evaluation${pending_count > 1 ? 's' : ''} for ${cycle_name}. Deadline: ${new Date(deadline).toLocaleDateString()}`,
            metadata: {
                cycle_name,
                cycle_id,
                deadline,
                days_remaining,
                pending_count
            },
            action_url: `/performance-evaluation`,
            priority: urgency
        }));

        return await NotificationModel.createBulk(notifications);
    },

    /**
     * Send Cycle Activation Notification
     * Triggered when cycle is activated
     */
    sendCycleActivationNotification: async ({
        organization_id,
        recipient_ids,
        cycle_name,
        cycle_id,
        start_date,
        end_date,
        admin_id
    }) => {
        const notifications = recipient_ids.map(recipient_id => ({
            organization_id,
            recipient_id,
            sender_id: admin_id,
            notification_type: 'cycle_activation',
            title: `New Evaluation Cycle: ${cycle_name}`,
            message: `${cycle_name} has been activated. Period: ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`,
            metadata: {
                cycle_name,
                cycle_id,
                start_date,
                end_date
            },
            action_url: `/performance-evaluation`,
            priority: 'normal'
        }));

        return await NotificationModel.createBulk(notifications);
    },

    /**
     * Send Cycle Closure Notification
     * Triggered when cycle is closed
     */
    sendCycleClosureNotification: async ({
        organization_id,
        recipient_ids,
        cycle_name,
        cycle_id,
        admin_id
    }) => {
        const notifications = recipient_ids.map(recipient_id => ({
            organization_id,
            recipient_id,
            sender_id: admin_id,
            notification_type: 'cycle_closure',
            title: `${cycle_name} Closed`,
            message: `The ${cycle_name} evaluation cycle has been closed. Results are now finalized.`,
            metadata: {
                cycle_name,
                cycle_id
            },
            action_url: `/performance-report`,
            priority: 'normal'
        }));

        return await NotificationModel.createBulk(notifications);
    }
};

module.exports = NotificationService;
