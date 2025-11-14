// controllers/cart.controllers.js
import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import crypto from "crypto";

// -------------------- HELPER: get cart by userId or anonId --------------------
const getCartDocument = async (userId, anonId) => {
  let cart;

  if (userId) {
    cart = await cartModel.findOne({ userId });
  } else {
    if (!anonId) {
      anonId = crypto.randomUUID();
    }
    cart = await cartModel.findOne({ anonId });
  }

  return { cart, anonId };
};

// -------------------- GET CART --------------------
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    let { cart, anonId } = await getCartDocument(userId, req.cookies?.anonId);

    // Auto-merge guest cart if user is logged in
    if (userId && req.cookies?.anonId) {
      const guestCart = await cartModel.findOne({ anonId });
      if (guestCart) {
        let userCart = await cartModel.findOne({ userId });
        if (!userCart) {
          guestCart.userId = userId;
          guestCart.anonId = null;
          await guestCart.save();
          cart = guestCart;
        } else {
          const map = new Map();
          userCart.items.forEach((i) => map.set(i.productId.toString(), i));

          guestCart.items.forEach((gItem) => {
            const pid = gItem.productId.toString();
            if (map.has(pid)) {
              map.get(pid).qty += gItem.qty;
            } else {
              userCart.items.push(gItem);
            }
          });

          await userCart.save();
          await cartModel.deleteOne({ _id: guestCart._id });
          cart = userCart;
        }

        // remove guest cookie
        res.clearCookie("anonId", { path: "/" });
      }
    }

    if (!cart) {
      cart = await cartModel.create({
        userId: userId || null,
        anonId: userId ? null : anonId,
        items: [],
      });
      if (!userId) res.cookie("anonId", anonId, { httpOnly: true, path: "/" });
    }

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("Get cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- ADD TO CART --------------------
const addToCart = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    const userId = req.user?.id || null;

    const { cart, anonId } = await getCartDocument(userId, req.cookies?.anonId);

    const product = await productModel.findById(productId).select("price");
    if (!product) return res.status(404).json({ message: "Product not found" });

    let finalCart = cart;
    if (!cart) {
      finalCart = await cartModel.create({
        userId: userId || null,
        anonId: userId ? null : anonId,
        items: [],
      });

      if (!userId) res.cookie("anonId", anonId, { httpOnly: true, path: "/" });
    }

    const existing = finalCart.items.find(
      (i) => i.productId.toString() === productId
    );
    if (existing) {
      existing.qty += qty;
    } else {
      finalCart.items.push({ productId, qty });
    }

    await finalCart.save();
    return res.json({ success: true, cart: finalCart });
  } catch (err) {
    console.error("Add to cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- UPDATE CART ITEM --------------------
const updateCartItem = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const userId = req.user?.id || null;

    const { cart, anonId } = await getCartDocument(userId, req.cookies?.anonId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item)
      return res.status(404).json({ message: "Item not found in cart" });

    item.qty = qty;
    await cart.save();

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("Update cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- REMOVE FROM CART --------------------
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id || null;

    const { cart, anonId } = await getCartDocument(userId, req.cookies?.anonId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("Remove from cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- CLEAR CART --------------------
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const { cart, anonId } = await getCartDocument(userId, req.cookies?.anonId);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    await cart.save();

    return res.json({ success: true, cart });
  } catch (err) {
    console.error("Clear cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- MERGE CART --------------------
const mergeCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { anonId } = req.body;

    if (!anonId) return res.status(400).json({ message: "anonId is required" });

    const guestCart = await cartModel.findOne({ anonId });
    if (!guestCart) return res.json({ success: true, cart: null });

    let userCart = await cartModel.findOne({ userId });
    if (!userCart) {
      guestCart.userId = userId;
      guestCart.anonId = null;
      await guestCart.save();
      return res.json({ success: true, cart: guestCart });
    }

    const map = new Map();
    userCart.items.forEach((i) => map.set(i.productId.toString(), i));

    guestCart.items.forEach((gItem) => {
      const pid = gItem.productId.toString();
      if (map.has(pid)) {
        map.get(pid).qty += gItem.qty;
      } else {
        userCart.items.push(gItem);
      }
    });

    await userCart.save();
    await cartModel.deleteOne({ _id: guestCart._id });

    return res.json({ success: true, cart: userCart });
  } catch (err) {
    console.error("Merge cart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------- GET CART COUNT --------------------
const getCartCount = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const { cart } = await getCartDocument(userId, req.cookies?.anonId);
    const count = cart?.items.reduce((acc, i) => acc + i.qty, 0) || 0;

    return res.json({ success: true, count });
  } catch (err) {
    console.error("Cart count error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  getCartCount,
};
