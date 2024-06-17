const jwt = require("jsonwebtoken");

const jwtAuthMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    res.status(403).json({
      message: "No token, authorization denied",
    });
  }

  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.user || !decoded.dealership || !decoded.admin) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    req.user = decoded.user;
    req.dealership = decoded.dealership;
    req.admin=decoded.admin;
    next();
  } catch (e) {
    console.log("Error authenticating token", e);
    res.status(401).json({
      message: "Invalid Token",
    });
  }
};

const generateToken = (user) => {
  const payload = {
    user: {
      id: user.id,
      role: user.role,
    },
    dealership: {
      id: user.id,
      role: user.role,
    },
    admin:{
      id: user.id,
      role: user.role,
    }
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 300000 });
};

module.exports = { jwtAuthMiddleware, generateToken };
