import express from "express";
import cors from "cors";
import "dotenv/config";
import aiRouter from "./routes/aiRoutes.js";
import { auth } from "./middlewares/auth.js";
import { clerkMiddleware } from "@clerk/express";

const app = express();

app.use(cors());
app.use(express.json());

// Clerk FIRST so req.auth is available
app.use(clerkMiddleware());

// (Optional) quick request log
app.use((req, _res, next) => {
  console.log(`📞 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/", (_req, res) => res.send("Server is Live!"));

// Protected AI routes
app.use("/api/ai", auth, aiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server is running on port", PORT);
});
