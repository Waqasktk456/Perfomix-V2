const db = require('./db');

async function debug() {
    try {
        const [rows] = await db.query('SELECT status, COUNT(*) as count FROM evaluations GROUP BY status');
        console.log('Evaluations Statuses:', rows);

        const [statusRows] = await db.query('SELECT status, COUNT(*) as count FROM evaluation_status GROUP BY status');
        console.log('Evaluation_status Statuses:', statusRows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
