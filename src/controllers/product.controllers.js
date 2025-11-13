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
      productType,
      isAffiliate,
      categoryName,
      categorySlug,
      brand,
      isActive,
      stock,
      sold,
      averageRating,
      reviewCount,
    } = req.body;

    // basic required checks
    if (!title || !priceAmount) {
      return res.status(400).json({
        success: false,
        message: "title and priceAmount are required",
      });
    }

    // build price object
    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };

    if (Number.isNaN(price.amount) || price.amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "priceAmount must be a number > 0" });
    }

    // offer validation (if provided)
    let parsedOffer;
    if (typeof offer !== "undefined" && offer !== null && offer !== "") {
      parsedOffer = Number(offer);
      if (Number.isNaN(parsedOffer) || parsedOffer < 0 || parsedOffer > 100) {
        return res.status(400).json({
          success: false,
          message: "offer must be a number between 0 and 100 (percentage).",
        });
      }
    }

    // offerDeadline validation: optional, must be future date if provided
    let parsedOfferDeadline = null;
    if (offerDeadline) {
      const dt = new Date(offerDeadline);
      if (isNaN(dt.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "offerDeadline must be a valid date." });
      }
      if (dt <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "offerDeadline must be a future date/time.",
        });
      }
      parsedOfferDeadline = dt;
    }

    // productType validation - allowed enum
    const ALLOWED_PRODUCT_TYPES = ["Standard", "BestSeller", "FlashSale"];
    let parsedProductType = "Standard";
    if (productType) {
      if (!ALLOWED_PRODUCT_TYPES.includes(productType)) {
        return res.status(400).json({
          success: false,
          message: `productType must be one of: ${ALLOWED_PRODUCT_TYPES.join(", ")}`,
        });
      }
      parsedProductType = productType;
    }

    // isAffiliate conversion
    const parsedIsAffiliate =
      typeof isAffiliate === "string"
        ? isAffiliate === "true"
        : typeof isAffiliate === "boolean"
        ? isAffiliate
        : Boolean(isAffiliate);

    // category
    const category = {
      name: categoryName,
      slug: categorySlug,
    };

    if (!category.name) {
      return res
        .status(400)
        .json({ success: false, message: "categoryName is required" });
    }
    if (!category.slug) {
      category.slug = slugify(category.name, { lower: true });
    }

    // files upload (same as before)
    const files = await Promise.all(
      (req.files || []).map(async (file) => {
        const uploaded = await uploadFile(file.buffer, file.originalname);
        return {
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnail || uploaded.thumbnailUrl || uploaded.url,
          fileId: uploaded.id || uploaded.fileId || null,
        };
      })
    );

    // safe numeric conversions and defaults
    const parsedStock = Number(stock || 0);
    const parsedSold = Number(sold || 0);
    const parsedAverageRating = Number(averageRating || 0);
    const parsedReviewCount = Number(reviewCount || 0);

    // create product document payload with new fields included
    const productPayload = {
      title: title.toString().trim(),
      description: description || "",
      price,
      images: files,
      offer: typeof parsedOffer !== "undefined" ? parsedOffer : undefined,
      offerDeadline: parsedOfferDeadline,
      productType: parsedProductType,
      category: {
        name: category.name,
        slug: category.slug,
      },
      brand: brand || "",
      isActive: typeof isActive !== "undefined" ? Boolean(isActive) : true,
      isAffiliate: parsedIsAffiliate,
      stock: Number.isNaN(parsedStock) ? 0 : parsedStock,
      sold: Number.isNaN(parsedSold) ? 0 : parsedSold,
      averageRating: Number.isNaN(parsedAverageRating) ? 0 : parsedAverageRating,
      reviewCount: Number.isNaN(parsedReviewCount) ? 0 : parsedReviewCount,
    };

    const created = await productModel.create(productPayload);

    return res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export { create };
