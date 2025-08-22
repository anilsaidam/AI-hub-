import sql from "../configs/db.js";

export const getUserCreations = async (req, res) => {
  try {
    const creations = await sql`SELECT * FROM creations WHERE user_id = ${req.userId} ORDER BY created_at DESC`;
    res.json({ success: true, creations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublishCreations = async (req, res) => {
  try {
    const creations = await sql`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;
    res.json({ success: true, creations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleLikeCreation = async (req, res) => {
  try {
    const { id } = req.body;

    const [creation] = await sql`SELECT * FROM creations WHERE id = ${id}`;

    if (!creation) {
      return res.status(404).json({ success: false, message: "Creation not found" });
    }

    const currentLikes = creation.likes || [];
    const userIdStr = req.userId.toString();
    
    let updatedLikes;
    let message = 'Like updated';

    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter(user => user !== userIdStr);
      message = 'Like removed';
    } else {
      updatedLikes = [...currentLikes, userIdStr];
      message = 'Creation Liked';
    }

    await sql`UPDATE creations SET likes = ${updatedLikes} WHERE id = ${id}`;

    res.json({ success: true, message, likes: updatedLikes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};