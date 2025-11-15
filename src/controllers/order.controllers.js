import orderModel from "../models/order.model.js";
import cartModel from "../models/cart.model.js";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";

// ------- GET CHECKOUT DATA -------
const getCheckout = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await cartModel
      .findOne({ userId })
      .populate("items.productId", "title image price offer");

    const items = (cart?.items || []).map((it) => ({
      product: it.productId,
      qty: it.qty ?? 1,
    }));

    const user = await userModel
      .findById(userId)
      .select("fullname email addresses");
    const addresses = user?.addresses || [];

    return res.json({ success: true, data: { items, addresses } });
  } catch (err) {
    console.error("Get checkout data error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ------- CREATE ORDER ---------
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};

    let rawItems =
      Array.isArray(body.items) && body.items.length ? body.items : null;
    if (
      !rawItems &&
      Array.isArray(body.shippingAddresses) &&
      body.shippingAddresses.length
    ) {
      rawItems = body.shippingAddresses;
    }

    if (!rawItems || rawItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    let chosenAddresses = [];
    if (Array.isArray(body.addresses) && body.addresses.length) {
      chosenAddresses.push(body.addresses[0]);
    } else {
      const user = await userModel.findById(userId).select("addresses");
      if (user && Array.isArray(user.addresses) && user.addresses.length) {
        chosenAddresses.push(user.addresses[0]);
      }
    }

    if (chosenAddresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shipping address provided or found",
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const it of rawItems) {
      let productId = null;
      let qty = Number(it.quantity ?? it.qty ?? 1);

      if (it.product) {
        productId =
          typeof it.product === "string"
            ? it.product
            : it.product._id || it.product.id || null;
      } else if (it.productId) {
        productId = it.productId;
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Item product id not found in one of the items",
        });
      }

      let priceAmount = null;
      let priceCurrency = "BDT";
      let offer = null;

      if (
        it.price &&
        typeof it.price === "object" &&
        (it.price.amount || it.price.amount === 0)
      ) {
        priceAmount = Number(it.price.amount);
        priceCurrency = it.price.currency || priceCurrency;
      } else if (
        it.product &&
        typeof it.product === "object" &&
        it.product.price
      ) {
        if (
          typeof it.product.price === "object" &&
          (it.product.price.amount || it.product.price.amount === 0)
        ) {
          priceAmount = Number(it.product.price.amount);
          priceCurrency = it.product.price.currency || priceCurrency;
        } else if (!isNaN(Number(it.product.price))) {
          priceAmount = Number(it.product.price);
        }
        offer = it.product.offer ?? null;
      }

      if (priceAmount === null) {
        const prod = await productModel
          .findById(productId)
          .select("price offer");
        if (!prod)
          return res.status(400).json({
            success: false,
            message: `Product not found: ${productId}`,
          });
        priceAmount = Number(prod.price);
        offer = prod.offer ?? null;
      }

      const finalPrice = offer
        ? Number(priceAmount) - Number(offer)
        : Number(priceAmount);
      totalAmount += finalPrice * qty;

      orderItems.push({
        product: productId,
        quantity: qty,
        price: { amount: finalPrice, currency: priceCurrency },
      });
    }

    const order = await orderModel.create({
      user: userId, // store only userId
      items: orderItems,
      totalPrice: { amount: totalAmount, currency: "BDT" },
      shippingAddresses: chosenAddresses,
    });

    // Clear cart
    try {
      const cart = await cartModel.findOne({ userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    } catch (e) {
      console.warn("Warning: failed to clear cart after order creation", e);
    }

    await order.populate("items.product", "title image price offer");
    await order.populate("user", "fullname email"); // populate only for response

    return res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------- GET USER ORDERS ---------
const getAllUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await orderModel
      .find({ user: userId })
      .populate("items.product", "title price offer")
      .populate("user", "fullname email");

    return res.json({ success: true, orders });
  } catch (err) {
    console.error("Get user orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------- UPDATE ORDER STATUS (ADMIN) ---------
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const order = await orderModel.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.status = status;
    await order.save();

    await order.populate("items.product", "title image price offer");
    await order.populate("user", "fullname email"); // populate only for response

    return res.json({ success: true, order });
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------- DELETE / CANCEL ORDER ---------
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const ownerId =
      typeof order.user === "object"
        ? String(order.user._id ?? order.user)
        : String(order.user);
    if (req.user.role !== "admin" && ownerId !== req.user.id)
      return res.status(403).json({ success: false, message: "Access denied" });

    await order.deleteOne();
    return res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("Delete order error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------- ADMIN STATS ---------
const getAdminStats = async (req, res) => {
  try {
    const totalOrders = await orderModel.countDocuments();

    const totalSalesAgg = await orderModel.aggregate([
      { $group: { _id: null, total: { $sum: "$totalPrice.amount" } } },
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;

    const revenueAgg = await orderModel.aggregate([
      { $match: { status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice.amount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const chartAgg = await orderModel.aggregate([
      { $match: { createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$totalPrice.amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label,
        total: 0,
      });
    }

    chartAgg.forEach((row) => {
      const y = row._id.year;
      const m = row._id.month;
      const found = months.find((mm) => mm.year === y && mm.month === m);
      if (found) found.total = row.total;
    });

    const chartData = months.map((m) => ({ label: m.label, total: m.total }));
    const chartLabels = chartData.map((c) => c.label);
    const chartValues = chartData.map((c) => c.total);

    return res.json({
      success: true,
      totalOrders,
      totalSales,
      totalRevenue,
      chartData,
      chartLabels,
      chartValues,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL ORDERS (admin only)
const getAllOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || "50", 10))
    );
    const skip = (page - 1) * limit;

    const orders = await orderModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.product", "title price offer image")
      .populate("user", "fullname email shippingAddresses");

    const total = await orderModel.countDocuments();

    return res.json({ success: true, total, page, limit, orders });
  } catch (err) {
    console.error("Get all orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  createOrder,
  getAllUserOrders,
  updateOrderStatus,
  deleteOrder,
  getAdminStats,
  getCheckout,
  getAllOrders,
};
