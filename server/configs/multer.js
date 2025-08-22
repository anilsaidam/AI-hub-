import multer from "multer";
import os from "os";

// Store uploads in OS temp dir; 10MB limit (tweak as you like)
export const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
