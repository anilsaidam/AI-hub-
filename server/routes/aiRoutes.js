import express from "express";
import {
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  removeImageObject,
  resumeReview,
} from "../controllers/aiController.js";
import { upload } from "../configs/multer.js";

const aiRouter = express.Router();

// Text routes
aiRouter.post("/generate-article", generateArticle);
aiRouter.post("/generate-blog-title", generateBlogTitle);

// Image generation
aiRouter.post("/generate-image", generateImage);

// Image editing
aiRouter.post("/remove-image-background", upload.single("image"), removeImageBackground);
aiRouter.post("/remove-image-object", upload.single("image"), removeImageObject);

// Resume review
aiRouter.post("/resume-review", upload.single("resume"), resumeReview);

export default aiRouter;
