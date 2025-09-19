const express = require("express");
const router = express.Router();
const Submission = require("../models/submission");
const { Classroom } = require("../models/class");
 
const Assignment = require("../models/assignments");
const LessonCompletion = require("../models/lesson_completion");
const mongoose = require("mongoose");

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

    // ensure assignment exists (lessonId)
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res.status(404).render("submission_page", {
        assignmentId,
        created: false,
        error: "Assignment not found."
      });
    }

    // save the submission
    await Submission.create({
      student: global.currentUser._id,
      assignment: assignmentId,
      answer: answer.trim()
    });

    //mark the lesson as completed for this student
    const rawLessonId =
      typeof assignment.lessonId === "string"
        ? assignment.lessonId
        : (assignment.lessonId?._id || assignment.lessonId);

    const lessonObjectId = mongoose.Types.ObjectId.isValid(rawLessonId)
      ? new mongoose.Types.ObjectId(rawLessonId)
      : null;

    if (!lessonObjectId) {
      console.warn("[submission] lessonId is not a valid ObjectId:", rawLessonId);
    }

    await LessonCompletion.updateOne(
      { student: global.currentUser._id, lesson: lessonObjectId || rawLessonId },
      { $setOnInsert: { completedAt: new Date() } },
      { upsert: true }
    );

    //show success
    return res.render("submission_page", {
      assignmentId,
      created: true,
      error: null
    });
  } catch (err) {
    console.error("[POST /submission] error:", err);
    return res.status(500).render("submission_page", {
      assignmentId: req.body.assignmentId || "",
      created: false,
      error: "Failed to save submission. Please try again."
    });
  }
});

module.exports = router;
