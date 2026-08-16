const express = require("express");
const authGuard = require("../middleware/authGuard");

const router = express.Router();

router.get("/profile", authGuard, (req, res) => {
  const { user } = req;
  res.status(200).json({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
});

router.get("/dashboard", authGuard, (req, res) => {
  res.status(200).json({
    message: "Welcome to your protected dashboard",
    user_id: req.user.id,
  });
});

router.get("/admin", authGuard, (req, res) => {
  const isAdmin = req.user.app_metadata?.role === "admin";

  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin privileges required" });
  }

  res.status(200).json({ message: "Welcome, admin", id: req.user.id });
});

module.exports = router;
