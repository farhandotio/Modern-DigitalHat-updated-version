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
        thumbnailUrl: String,
        fileId: String,
      },
    ],
    offer: {
      type: Number,
    },
    offerDeadline: {
      type: Date,
      default: null,
    },

    productType: {
      type: String,
      enum: ["Standard", "Featured", "HotDeals"],
      default: "Standard",
    },

    category: {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, lowercase: true },
    },
    brand: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAffiliate: {
      type: Boolean,
      default: false,
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

productSchema.index({
  title: "text",
  "category.slug": "text",
  description: "text",
});

const productModel = mongoose.model("product", productSchema);

export default productModel;
