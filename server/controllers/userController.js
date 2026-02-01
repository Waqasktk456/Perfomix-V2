const pool = require('../config/db');

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  let picture = req.body.picture;

  if (req.file) {
    picture = `/uploads/${req.file.filename}`;
  }

  try {
    console.log('Updating user:', { id, name, email, picture });
    await pool.execute('UPDATE users SET name = ?, email = ?, picture = ? WHERE id = ?', [name, email, picture, id]);
    res.json({ message: 'User updated successfully', picture });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  const userRole = req.user.role; // From verifyToken middleware

  try {
    let user;
    let tableName;
    let passwordField;

    if (userRole === 'admin' || userRole === 'super_admin') {
      const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
      user = rows[0];
      tableName = 'users';
      passwordField = 'password';
    } else {
      const [rows] = await pool.execute('SELECT * FROM employees WHERE id = ?', [id]);
      user = rows[0];
      tableName = 'employees';
      passwordField = 'user_password';
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const currentPassword = user[passwordField];
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'No password set. Please use Google login or set a password.' });
    }

    const isValid = await require('bcrypt').compare(oldPassword, currentPassword);
    if (!isValid) return res.status(401).json({ success: false, message: 'Incorrect current password' });

    const hashedPassword = await require('bcrypt').hash(newPassword, 10);
    await pool.execute(`UPDATE ${tableName} SET ${passwordField} = ? WHERE id = ?`, [hashedPassword, id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};