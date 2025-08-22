import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    // Works for both old (function) and new (object) shapes
    let userId = null;
    try {
      if (typeof req.auth === "function") {
        const authData = req.auth();
        userId = authData?.userId;
      } else if (req.auth?.userId) {
        userId = req.auth.userId;
      }
    } catch (e) {
      console.log("Auth extraction failed:", e?.message);
    }

    console.log(`🔍 Extracted userId: ${userId}`);
    if (!userId) {
      console.log("❌ No userId found - unauthorized");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch user + initialize metadata (free_usage / plan) if needed
    const user = await clerkClient.users.getUser(userId);
    let free_usage = user.privateMetadata?.free_usage;
    let plan = user.privateMetadata?.plan;

    let needsUpdate = false;
    if (free_usage === undefined || free_usage === null) {
      free_usage = 0; needsUpdate = true;
    }
    if (!plan) {
      plan = "free"; needsUpdate = true;
    }
    if (needsUpdate) {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { ...user.privateMetadata, free_usage, plan },
      });
    }

    req.userId = userId;
    req.plan = plan === "premium" ? "premium" : "free";
    req.free_usage = Number(free_usage);
    req.user = user;

    console.log(
      `📊 Auth complete: userId=${req.userId}, plan=${req.plan}, free_usage=${req.free_usage}`
    );

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
