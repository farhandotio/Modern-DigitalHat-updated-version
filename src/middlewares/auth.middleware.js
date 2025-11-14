// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";

// -------------------- REQUIRE LOGIN --------------------
const requireAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = { id: user._id, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// -------------------- OPTIONAL LOGIN --------------------
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) req.user = null;
    else req.user = { id: user._id, email: user.email, role: user.role };

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// -------------------- ADMIN ONLY --------------------
const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied. Admins only." });
  next();
};

export { requireAuth, optionalAuth, isAdmin };
