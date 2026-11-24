const express = require("express");

const {
  getTikTokCreatorInfo,
} = require("../services/tiktokAuth");

const router = express.Router();

// Return safe creator information to the frontend.
// Access tokens and refresh tokens are never included.
router.get("/creator-info", async (req, res) => {
  try {
    const creator = await getTikTokCreatorInfo();

    res.json({
      success: true,
      creator: {
        username: creator.creator_username,
        nickname: creator.creator_nickname,
        avatarUrl: creator.creator_avatar_url,
        privacyOptions: creator.privacy_level_options,
        commentDisabled: creator.comment_disabled,
        duetDisabled: creator.duet_disabled,
        stitchDisabled: creator.stitch_disabled,
        maxVideoDuration: creator.max_video_post_duration_sec,
      },
    });
  } catch (error) {
    console.error("TikTok creator info route error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;