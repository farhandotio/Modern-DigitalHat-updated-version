import productModel from "../models/product.model.js";
import uploadFile from "../services/storage.service.js";
import slugify from "slugify";

async function create(req, res) {
  try {
    const {
      title,
      description,
      priceAmount,
      priceCurrency = "BDT",
      offer,
      offerDeadline,
      productType = "Standard",
      isAffiliate = false,
      categoryName,
      categorySlug,
      brand,
      isActive = true,
      stock = 0,
    } = req.body;

    // Basic required checks
    if (!title || !priceAmount || !categoryName) {
      return res.status(400).json({
        success: false,
        message: "title, priceAmount, and categoryName are required",
      });
    }

    // Build price object
    const price = { amount: Number(priceAmount), currency: priceCurrency };

    // Category
    const category = {
      name: categoryName,
      slug: categorySlug || slugify(categoryName, { lower: true }),
    };

    // Upload images if any
    const images = await Promise.all(
      (req.files || []).map(async (file) => {
        const uploaded = await uploadFile(file.buffer, file.originalname);
        return {
          url: uploaded.url,
          thumbnailUrl:
            uploaded.thumbnail || uploaded.thumbnailUrl || uploaded.url,
          fileId: uploaded.id || uploaded.fileId || null,
        };
      })
    );

    // Prepare product payload
    const productPayload = {
      title: title.trim(),
      description: description || "",
      price,
      images,
      offer,
      offerDeadline: offerDeadline ? new Date(offerDeadline) : null,
      productType,
      isAffiliate: Boolean(isAffiliate),
      category,
      brand: brand || "",
      isActive: Boolean(isActive),
      stock: Number(stock) || 0,
      sold: 0,
      averageRating: 0,
      reviewCount: 0,
    };

    const created = await productModel.create(productPayload);
    return res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const {
      title,
      description,
      priceAmount,
      priceCurrency,
      offer,
      offerDeadline,
      productType,
      isAffiliate,
      categoryName,
      categorySlug,
      brand,
      isActive,
      stock,
    } = req.body;

    const updateData = {};

    // Simple updates
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description;
    if (typeof isAffiliate !== "undefined")
      updateData.isAffiliate = isAffiliate === "true" || isAffiliate === true;
    if (typeof isActive !== "undefined")
      updateData.isActive = isActive === "true" || isActive === true;
    if (typeof stock !== "undefined") updateData.stock = Number(stock);

    // Price update
    if (priceAmount) {
      const parsedPrice = Number(priceAmount);
      if (isNaN(parsedPrice) || parsedPrice <= 0)
        return res
          .status(400)
          .json({ success: false, message: "priceAmount must be > 0" });
      updateData.price = {
        amount: parsedPrice,
        currency: priceCurrency || product.price.currency,
      };
    }

    // Offer update
    if (offer !== undefined) {
      const parsedOffer = Number(offer);
      if (isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100)
        return res.status(400).json({
          success: false,
          message: "Offer must be between 0 and 100",
        });
      updateData.offer = parsedOffer;
    }

    // OfferDeadline
    if (offerDeadline) {
      const dt = new Date(offerDeadline);
      if (isNaN(dt.getTime()) || dt <= new Date())
        return res.status(400).json({
          success: false,
          message: "OfferDeadline must be a valid future date",
        });
      updateData.offerDeadline = dt;
    }

    // ProductType update
    const ALLOWED_PRODUCT_TYPES = ["Standard", "HotDeals", "Featured"];
    if (productType) {
      if (!ALLOWED_PRODUCT_TYPES.includes(productType))
        return res.status(400).json({
          success: false,
          message: `productType must be one of: ${ALLOWED_PRODUCT_TYPES.join(
            ", "
          )}`,
        });
      updateData.productType = productType;
    }

    // Category update
    if (categoryName || categorySlug) {
      updateData.category = {
        name: categoryName || product.category.name,
        slug:
          categorySlug ||
          slugify(categoryName || product.category.name, { lower: true }),
      };
    }

    // Brand
    if (brand) updateData.brand = brand;

    // Images update via req.files
    if (req.files && req.files.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const uploaded = await uploadFile(file.buffer, file.originalname);
          return {
            url: uploaded.url,
            thumbnailUrl:
              uploaded.thumbnail || uploaded.thumbnailUrl || uploaded.url,
            fileId: uploaded.id || uploaded.fileId || null,
          };
        })
      );
      // Optionally delete old images from storage here
      updateData.images = uploadedImages;
    }

    // Update product in DB
    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json({ success: true, product: updatedProduct });
  } catch (err) {
    console.error("Update product error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function fetchAll(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sort,
      minprice,
      maxprice,
      q,
    } = req.query;

    const filter = {};

    if (q) filter.$text = { $search: q };

    if (category) filter["category.slug"] = category.toLowerCase();

    if (minprice)
      filter["price.amount"] = {
        ...filter["price.amount"],
        $gte: Number(minprice),
      };
    if (maxprice)
      filter["price.amount"] = {
        ...filter["price.amount"],
        $lte: Number(maxprice),
      };

    let query = productModel.find(filter);

    // Sorting
    if (sort) {
      const sortObj = {};
      if (sort === "price") sortObj["price.amount"] = 1;
      else if (sort === "-price") sortObj["price.amount"] = -1;
      else if (sort === "newest") sortObj["createdAt"] = -1;
      query = query.sort(sortObj);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const total = await productModel.countDocuments(filter);
    const products = await query.skip(skip).limit(Number(limit));

    return res.status(200).json({ success: true, data: products, total });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function fetchCategories(req, res) {
  try {
    const categories = await productModel.aggregate([
      {
        $match: {
          "category.slug": { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$category.slug",
          slug: { $first: "$category.slug" },
          name: { $first: "$category.name" },
        },
      },
      {
        $project: {
          _id: 0,
          slug: 1,
          name: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("Fetch categories error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching categories",
    });
  }
}

async function fetchById(req, res) {
  const { id } = req.params;

  const product = await productModel.findById(id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res
    .status(200)
    .json({ message: "Product fetch successfully!", product: product });
}

async function deleteOne(req, res) {
  try {
    const { id } = req.params;

    const deletedProduct = await productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      product: deletedProduct,
    });
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export { create, fetchAll, fetchById, update, deleteOne, fetchCategories };
