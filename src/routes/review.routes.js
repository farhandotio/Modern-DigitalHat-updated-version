import express from "express";
import * as controller from "../controllers/review.controllers.js";
import * as middleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// Add a review
router.post("/", middleware.requireAuth, controller.addReview);

// Delete a review (admin only)
router.delete("/:id", middleware.requireAuth, middleware.isAdmin, controller.deleteReview);

// Get all reviews for a product
router.get("/product/:productId", controller.getProductReviews);

// Get all reviews (admin panel)
router.get("/admin", middleware.requireAuth, middleware.isAdmin, controller.getAllReviews);

// Update a review (user only)
router.patch("/:id", middleware.requireAuth, controller.updateReview);

// Get single review
router.get("/:id", middleware.requireAuth, controller.getReviewById);

export default router;
