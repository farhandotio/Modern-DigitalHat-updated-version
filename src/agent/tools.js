import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

/** Axios instance for cleaner requests */
const http = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 10000,
});

/** Search products by query */
const searchProduct = tool(
  async ({ query, token }) => {
    try {
      const res = await http.get("/api/products", {
        params: { q: query },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // Return only the data array for simplicity
      return JSON.stringify(res.data?.data || []);
    } catch (err) {
      // Catch network/server errors
      return JSON.stringify({
        success: false,
        error: err?.response?.data || err.message || "Unknown error",
      });
    }
  },
  {
    name: "searchProduct",
    description: "Search for products based on a query",
    inputSchema: z.object({
      query: z.string().describe("The search query for products"),
      token: z.string().optional(),
    }),
  }
);

/** Add a product to cart (robust to AI input format) */
const addProductToCart = tool(
  async ({ productId, qty = 1, token, input }) => {
    try {
      // Normalize input: support { productId } or just input string
      productId = productId || input;

      if (!productId) {
        return JSON.stringify({
          success: false,
          error: "Product ID is required",
        });
      }

      const res = await http.post(
        "/api/cart/add",
        { productId, qty },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );

      return JSON.stringify({
        success: true,
        message: `Added product ${productId} (qty: ${qty}) to cart`,
        data: res.data,
      });
    } catch (err) {
      return JSON.stringify({
        success: false,
        error: err?.response?.data || err.message || "Unknown error",
      });
    }
  },
  {
    name: "addProductToCart",
    description:
      "Add a product to the shopping cart. Accepts either productId or input (string).",
    inputSchema: z.object({
      productId: z.string().optional().describe("The id of the product to add to cart"),
      qty: z.number().default(1).describe("Quantity of product"),
      token: z.string().optional(),
      input: z
        .string()
        .optional()
        .describe("Optional string input (used if AI sends just 'input' with product ID)"),
    }),
  }
);

export default { searchProduct, addProductToCart };
