// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyGoogleToken } = require("../services/authService");
const User = require("../models/User");

// JWT Secret check
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set in .env. Exiting.");
  process.exit(1);
}

// =======================
// SIGNUP (Email + Password)
// =======================
router.post("/signup", async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    // Validation
    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, email, and password are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    await User.createUser({
      googleId: null,
      email: email,
      name: firstName,
      picture: null,
      role: "admin",
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully! Please login."
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during signup"
    });
  }
});

// =======================
// NORMAL LOGIN (Email + Password)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // This now returns password + id + role correctly from employees table
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if account uses password login
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google login only"
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Get full employee data for frontend (profile pic, name, etc.)
    const [employeeRows] = await require('../config/db').execute(
      "SELECT * FROM employees WHERE email = ?",
      [email]
    );
    const employee = employeeRows[0] || null;

    if (user.role.toLowerCase() === "admin") {
      // For admins, get org from users table relationship
      const [orgRows] = await require('../config/db').execute(
        "SELECT id FROM organizations WHERE created_by = ?",
        [user.id]
      );
      hasOrganization = orgRows.length > 0;
      organizationId = hasOrganization ? orgRows[0].id : null;
    } else {
      // For employees/line-managers, get org from their employee record
      organizationId = employee ? employee.organization_id : null;
      hasOrganization = !!organizationId;
    }

    // Generate JWT — user.id is now correctly set (Employee_id or users.id)
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organizationId: organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      userId: user.id,
      organizationId,
      hasOrganization,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture
      },
      employee, // full employee object
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

// =======================
// GOOGLE LOGIN
// =======================
router.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token missing" });
    }

    const payload = await verifyGoogleToken(token);

    let user = await User.findByEmail(payload.email);

    if (!user) {
      // Create new admin user via Google
      await User.createUser({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        role: "admin",
        password: null,
      });
      user = await User.findByEmail(payload.email);
    }

    // Try to find linked employee record
    const [employeeRows] = await require('../config/db').execute(
      "SELECT * FROM employees WHERE email = ?",
      [payload.email]
    );
    const employee = employeeRows[0] || null;

    // Organization check
    let hasOrganization = false;
    let organizationId = null;
    if (user.role.toLowerCase() === "admin") {
      const [orgRows] = await require('../config/db').execute(
        "SELECT id FROM organizations WHERE created_by = ?",
        [user.id]
      );
      hasOrganization = orgRows.length > 0;
      organizationId = hasOrganization ? orgRows[0].id : null;
    } else {
      organizationId = employee ? employee.organization_id : null;
      hasOrganization = !!organizationId;
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organizationId: organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Google login successful",
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name || payload.name,
        email: user.email,
        role: user.role,
      },
      hasOrganization,
      organizationId,
      employee,
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({
      success: false,
      message: "Google authentication failed"
    });
  }
});

module.exports = router;