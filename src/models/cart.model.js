import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const CartItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    // Logged-in cart
    userId: { type: Types.ObjectId, ref: "User", default: null },

    // Guest cart (offline cart)
    anonId: { type: String, default: null, index: true },

    // Cart items
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

const cartModel = model("cart", CartSchema);
export default cartModel;
