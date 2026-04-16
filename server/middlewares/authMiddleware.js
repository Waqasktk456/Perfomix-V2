const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    let organizationId = decoded.organizationId;

    // If token has no organizationId, fetch it fresh from DB
    if (!organizationId && decoded.id) {
      try {
        const [[user]] = await db.query(
          'SELECT organization_id FROM users WHERE id = ? AND deleted_at IS NULL',
          [decoded.id]
        );
        organizationId = user?.organization_id || null;
      } catch (dbErr) {
        console.error("DB lookup for organizationId failed:", dbErr.message);
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      organizationId,
    };

    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};