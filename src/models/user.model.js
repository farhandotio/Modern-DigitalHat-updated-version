import mongoose from "mongoose";

const addressShema = new mongoose.Schema({
  phone: String,
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  isDefalt: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullname: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  googleId: { type: String },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    select: false
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  addresses: [addressShema],
});

const userModel = mongoose.model("user", userSchema);

export default userModel;
