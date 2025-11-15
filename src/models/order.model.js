import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Shipping address schema
const addressSchema = new Schema({
  phone: String,
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  isDefault: { type: Boolean, default: false },
});

// Order item schema
const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "product", required: true },
  quantity: { type: Number, min: 1, default: 1 },
  price: {
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ["USD", "BDT"] },
  },
});

// Main order schema
const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    items: { type: [orderItemSchema], required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "DELIVERED"],
      default: "PENDING",
    },
    totalPrice: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true, enum: ["USD", "BDT"] },
    },
    shippingAddresses: { type: [addressSchema], required: true },
    count: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const orderModel = model("order", orderSchema);

export default orderModel;
