const bcrypt = require('bcrypt');
const db = require('./config/db');

(async () => {
  try {
    const [rows] = await db.query(
      "SELECT id, user_password FROM employees WHERE organization_id = 8 AND user_password = 'corvixo123'"
    );

    console.log(`Found ${rows.length} employees to hash...`);

    for (const row of rows) {
      const hashed = await bcrypt.hash(row.user_password, 10);
      await db.query('UPDATE employees SET user_password = ? WHERE id = ?', [hashed, row.id]);
    }

    console.log('✅ All passwords hashed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
