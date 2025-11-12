import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";

async function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = decoded;

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized." });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied. Admins only." });

  next();
};

export { verifyToken, isAdmin };
