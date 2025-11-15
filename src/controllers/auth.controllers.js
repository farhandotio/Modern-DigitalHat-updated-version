// src/controllers/auth.controllers.js
import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

/** REGISTER */
const register = async (req, res) => {
  try {
    const { fullname = {}, email, password } = req.body;
    const firstName = fullname.firstName;
    const lastName = fullname.lastName;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const isUserExist = await userModel.findOne({ email });
    if (isUserExist) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      email,
      fullname: { firstName, lastName },
      password: hash,
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none",
    });

    return res.status(201).json({
      message: "User registered successfully!",
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        addresses: user.addresses ?? [],
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** LOGIN */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Send token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send response
    return res.status(200).json({
      message: "Logged in successfully.",
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        addresses: user.addresses ?? [],
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/** PROFILE - returns current user info */
const profile = async (req, res) => {
  const id = req.user.id;

  const user = await userModel.findById(id);

  return res.status(200).json({
    message: "User fetch successfully!",
    user: user,
  });
};

/** LOGOUT - clear cookie */
async function logout(req, res) {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    expires: new Date(0),
  });

  return res.status(200).json({ message: "Logged out successfully" });
}

/* UPDATE USER */
const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const { fullname, email } = req.body;
    const updateData = {};

    if (fullname && typeof fullname === "object") {
      const { firstName, lastName } = fullname;
      updateData.fullname = {};
      if (firstName) updateData.fullname.firstName = firstName;
      if (lastName) updateData.fullname.lastName = lastName;
    }

    if (email) updateData.email = email;

    const updatedUser = await userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /admin/users
const allUsers = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select("fullname email role addresses createdAt");

    return res.json({
      success: true,
      total: users.length,
      users,
    });
  } catch (err) {
    console.error("All users error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// DELETE /admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userModel.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully",
      deletedUserId: id,
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/** FETCH - addresses */
async function getAddresses(req, res) {
  const id = req.user.id;

  const user = await userModel.findById(id).select("addresses");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "User addresses fetched successfully!",
    addresses: user.addresses,
  });
}

/** POST - addresses */
async function addAddress(req, res) {
  const id = req.user.id;

  const { phone, street, city, state, zip, country, isDefault } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: id },
    {
      $push: {
        addresses: {
          phone,
          street,
          city,
          state,
          zip,
          country,
          isDefault,
        },
      },
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(201).json({
    message: "Address added successfully!",
    address: user.addresses,
  });
}

/** DELETE - addresses */
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    const user = await userModel.findOneAndUpdate(
      { _id: userId },
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addressStillExists = user.addresses.some(
      (addr) => addr._id.toString() === addressId
    );

    if (addressStillExists) {
      return res.status(500).json({ message: "Failed to delete address" });
    }

    return res.status(200).json({
      message: "Address deleted successfully!",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/** FORGOT - password */
const requestPasswordReset = async (req, res) => {
  try {
    // Email can come from query param or body
    const email = req.query.email || req.body.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // generate token & expiry
    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = token;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendEmail({
      to: user.email,
      subject: "Reset Password",
      text: `Click here: ${resetUrl}`,
    });

    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Token and new password required" });
    }

    // find user by token & check expiry
    const user = await userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() },
      })
      .select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // hash new password & save
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  register,
  login,
  profile,
  logout,
  updateUser,
  allUsers,
  deleteUser,
  getAddresses,
  addAddress,
  deleteAddress,
  requestPasswordReset,
  resetPassword,
};
