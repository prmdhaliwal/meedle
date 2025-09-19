const express = require("express");
const router = express.Router();
const Submission = require("../models/submission");
const { Classroom } = require("../models/class");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

// Shows submission page
router.get("/new", requireLogin, (req, res) => {
  const { assignmentId } = req.query;
  res.render("submission_page", {
    Classroom: "",
    assignments: "",
    content: "",
    assignmentId: assignmentId || "",
    created: false,
    error: null
  });
});

// save the submission to mongoDB
router.post("/", requireLogin, async (req, res) => {
  try {
    const { assignmentId, answer } = req.body;

    if (!assignmentId || !answer || !answer.trim()) {
      return res.status(400).render("submission_page", {
        assignmentId: assignmentId || "",
        created: false,
        error: "Please provide an answer before submitting."
      });
    }

    await Submission.create({
      student: global.currentUser._id,
      assignment: assignmentId,
      answer: answer.trim()
    });

    return res.render("submission_page", {
      assignmentId,
      created: true,
      error: null
    });
  } catch (err) {
    console.error("[POST /submission] save error:", err);
    return res.status(500).render("submission_page", {
      assignmentId: req.body.assignmentId || "",
      created: false,
      error: "Failed to save submission. Please try again."
    });
  }
});

module.exports = router;
