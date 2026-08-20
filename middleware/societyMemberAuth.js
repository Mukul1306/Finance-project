const jwt = require("jsonwebtoken");

const societyMemberAuth = (req, res, next) => {
  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization"
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      decoded.role !==
      "SOCIETY_MEMBER"
    ) {
      return res.status(403).json({
        success: false,
        message: "Society member access denied"
      });
    }

    req.memberId = decoded.id;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired login"
    });
  }
};

module.exports = societyMemberAuth;