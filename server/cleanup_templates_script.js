// server/cleanup_templates_script.js
const db = require('./config/db');

async function cleanupTemplates() {
    try {
        console.log('Starting template cleanup...');

        // Deactivate old templates (1 and 2)
        const [updateResult] = await db.query(
            'UPDATE matrix_templates SET is_active = 0 WHERE id IN (1, 2)'
        );
        console.log('Deactivated old templates:', updateResult.info);

        // Ensure new templates (10 and 11) are active
        const [activateResult] = await db.query(
            'UPDATE matrix_templates SET is_active = 1 WHERE id IN (10, 11)'
        );
        console.log('Activated new templates:', activateResult.info);

        console.log('Cleanup complete. The Template Gallery should now only show the comprehensive templates.');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupTemplates();
