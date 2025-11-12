import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan"

// Import routes
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes call
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

export default app;
