import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import reviewModel from "../models/review.model.js";

// ---------------- Add Review ----------------
const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const user = req.user;

    if (!user || !productId || !rating) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const review = await reviewModel.create({
      productId,
      userId: user.id,
      rating,
      comment,
    });

    // Update product stats
    const stats = await reviewModel.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await productModel.findByIdAndUpdate(productId, {
        averageRating: stats[0].averageRating,
        reviewCount: stats[0].reviewCount,
      });
    }

    // Populate user in response
    await review.populate("userId", "fullname email role");

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------- Get Reviews for a Product ----------------
const getProductReviews = async (req, res) => {
  try {
    const reviews = await reviewModel
      .find({ productId: req.params.productId })
      .populate("userId", "fullname email role")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------- Get All Reviews (Admin Panel) ----------------
const getAllReviews = async (req, res) => {
  try {
    const reviews = await reviewModel
      .find()
      .populate("userId", "fullname email role")
      .populate("productId", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------- Update Review ----------------
const updateReview = async (req, res) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });

    // ensure both sides are strings when comparing
    const reviewOwnerId = review.userId?.toString();
    const requesterId = req.user?.id?.toString() || req.user?._id?.toString();

    if (reviewOwnerId !== requesterId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Only allow updating rating and comment
    const { rating, comment } = req.body;
    let changed = false;
    if (rating !== undefined) {
      // optional: validate rating range here
      review.rating = rating;
      changed = true;
    }
    if (comment !== undefined) {
      review.comment = comment;
      changed = true;
    }

    if (!changed) {
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    }

    await review.save();

    // Recompute product stats
    const stats = await reviewModel.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(review.productId) } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    await productModel.findByIdAndUpdate(review.productId, {
      averageRating: stats.length ? stats[0].averageRating : 0,
      reviewCount: stats.length ? stats[0].reviewCount : 0,
    });

    // Populate user info and return only needed fields
    await review.populate("userId", "fullname email role");
    const response = {
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: review.userId, // populated
    };

    res.status(200).json({ success: true, review: response });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------- Delete Review ----------------
const deleteReview = async (req, res) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const productId = review.productId;

    await review.deleteOne(); // safer than .remove()

    // Update product stats
    const stats = await reviewModel.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    await productModel.findByIdAndUpdate(productId, {
      averageRating: stats.length ? stats[0].averageRating : 0,
      reviewCount: stats.length ? stats[0].reviewCount : 0,
    });

    res.status(200).json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------- Get Single Review ----------------
const getReviewById = async (req, res) => {
  try {
    const review = await reviewModel
      .findById(req.params.id)
      .populate("userId", "fullname email role");
    if (!review) return res.status(404).json({ message: "Review not found" });

    res.status(200).json({ success: true, review });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  addReview,
  deleteReview,
  getAllReviews,
  getProductReviews,
  updateReview,
  getReviewById,
};
