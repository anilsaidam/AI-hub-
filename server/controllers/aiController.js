// controllers/aiController.js
import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import cloudinary from "../configs/cloudinary.js";
import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import FormData from "form-data";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// --------- Helpers ---------
const checkPremiumStatus = async (userId) => {
  try {
    const user = await clerkClient.users.getUser(userId);
    const meta = user.privateMetadata || {};
    // Supports either `is_premium` or `plan: 'premium'`
    return Boolean(meta.is_premium || meta.plan === "premium");
  } catch (err) {
    console.error("Error checking premium:", err.message);
    return false;
  }
};

const getFreeUsage = async (userId) => {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.privateMetadata?.free_usage || 0;
  } catch {
    return 0;
  }
};

const incrementFreeUsage = async (userId) => {
  try {
    const current = await getFreeUsage(userId);
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { free_usage: current + 1 },
    });
  } catch (err) {
    console.error("Failed to increment usage:", err.message);
  }
};

// --------- Generate Article ---------
export const generateArticle = async (req, res) => {
  try {
    const { prompt, length } = req.body;
    if (!prompt || !length) {
      return res
        .status(400)
        .json({ success: false, message: "Prompt and length are required" });
    }

    const isPremium = await checkPremiumStatus(req.userId);
    const freeUsage = await getFreeUsage(req.userId);

    if (!isPremium && freeUsage >= 10) {
      return res.json({
        success: false,
        message: "Free limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: parseInt(length),
    });

    const content = response.choices[0].message?.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.userId}, ${prompt}, ${content}, 'article')
    `;

    if (!isPremium) await incrementFreeUsage(req.userId);

    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --------- Generate Blog Title ---------
export const generateBlogTitle = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "Prompt is required" });
    }

    const isPremium = await checkPremiumStatus(req.userId);
    const freeUsage = await getFreeUsage(req.userId);

    if (!isPremium && freeUsage >= 10) {
      return res.json({
        success: false,
        message: "Free limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message?.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.userId}, ${prompt}, ${content}, 'blog-title')
    `;

    if (!isPremium) await incrementFreeUsage(req.userId);

    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --------- Generate Image (Premium only) ---------
export const generateImage = async (req, res) => {
  try {
    const { prompt, publish } = req.body;
    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "Prompt is required" });
    }

    const isPremium = await checkPremiumStatus(req.userId);
    if (!isPremium) {
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription.",
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const response = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image =
      `data:image/png;base64,${Buffer.from(response.data).toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: "ai-hub-images",
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${req.userId}, ${prompt}, ${uploadResult.secure_url}, 'image', ${
        publish || false
      })
    `;

    res.json({ success: true, content: uploadResult.secure_url });
  } catch (err) {
    console.error("Generate image error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate image." });
  }
};

// --------- Remove Background (using Remove.bg API or fallback) ---------
export const removeImageBackground = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    console.log("File received:", req.file);

    const isPremium = await checkPremiumStatus(req.userId);
    if (!isPremium) {
      fs.unlinkSync(req.file.path);
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription.",
      });
    }

    // If REMOVE_BG_API_KEY not set, just upload the original as fallback
    if (!process.env.REMOVE_BG_API_KEY) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "ai-hub-images",
      });

      fs.unlinkSync(req.file.path);

      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${req.userId}, 'Remove background from image', ${uploadResult.secure_url}, 'image')
      `;

      return res.json({
        success: true,
        content: uploadResult.secure_url,
        message:
          "Background removal service not configured. Image uploaded normally.",
      });
    }

    // Call remove.bg
    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(req.file.path));
    formData.append("size", "auto");

    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      formData,
      {
        headers: {
          "X-Api-Key": process.env.REMOVE_BG_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    // Save processed image temporarily
    const tempFilePath = `${req.file.path}_nobg.png`;
    fs.writeFileSync(tempFilePath, response.data);

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: "ai-hub-images",
    });

    // Cleanup
    fs.unlinkSync(req.file.path);
    fs.unlinkSync(tempFilePath);

    // Save to DB
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.userId}, 'Remove background from image', ${uploadResult.secure_url}, 'image')
    `;

    res.json({ success: true, content: uploadResult.secure_url });
  } catch (error) {
    console.error("Remove background error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({
      success: false,
      message: "Failed to remove background. Please try again.",
    });
  }
};

// --------- Remove Object (basic demo using Cloudinary AI background removal) ---------
export const removeImageObject = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Image file is required" });

    const { object } = req.body;
    if (!object)
      return res
        .status(400)
        .json({ success: false, message: "Object to remove is required" });

    const isPremium = await checkPremiumStatus(req.userId);
    if (!isPremium) {
      fs.unlinkSync(req.file.path);
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription.",
      });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "ai-hub-images",
    });
    fs.unlinkSync(req.file.path);

    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [{ effect: "background_removal:cloudinary_ai" }],
      secure: true,
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.userId}, ${`Remove ${object} from image`}, ${transformedUrl}, 'image')
    `;

    res.json({ success: true, content: transformedUrl });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to remove object." });
  }
};

// --------- Resume Review ---------
export const resumeReview = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Resume file is required" });

    const isPremium = await checkPremiumStatus(req.userId);
    if (!isPremium) {
      fs.unlinkSync(req.file.path);
      return res.json({
        success: false,
        message: "This feature is only available for premium subscription.",
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Resume file size exceeds 5MB." });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    fs.unlinkSync(req.file.path);

    const prompt = `Review this resume and give constructive feedback:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message?.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.userId}, 'Resume review', ${content}, 'resume-review')
    `;

    res.json({ success: true, content });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to review resume." });
  }
};
