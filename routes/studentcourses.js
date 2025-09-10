// routes/studentcourses.js
const express = require("express");
const router = express.Router();
const Enrollment = require("../models/enrollment");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

router.get("/courses", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const enrolls = await Enrollment.find({ student: me._id }).populate("course").lean();
    const courses = enrolls.map(e => e.course).filter(Boolean);
    res.render("student-courses", { user: me, courses });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


router.get("/manage-enrollments", requireLogin, (req, res) => {
  res.render("manage-enrollments", { user: global.currentUser });
});

router.get("/api/my-courses", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const enrolls = await Enrollment.find({ student: me._id }).populate("course").lean();
    const courses = enrolls.map(e => e.course).filter(Boolean);
    res.json({ student_id: String(me._id), courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;