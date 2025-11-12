import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    price: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        enum: ["USD", "BDT"],
        default: "BDT",
      },
    },
    images: [
      {
        url: String,
        thumbnail: String,
        id: String,
      },
    ],
    offer: {
      type: Number,
    },
    category: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    sold: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Review stats
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const productModel = mongoose.model("product", productSchema);

export default productModel;
