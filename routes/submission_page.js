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

// Shows submission page (now passes lessonId for the Back button)
router.get("/new", requireLogin, async (req, res) => {
  try {
    const { assignmentId } = req.query;

    let lessonId = "";
    if (assignmentId) {
      const assignment = await Assignment.findById(assignmentId).lean();
      if (assignment) {
        lessonId =
          typeof assignment.lessonId === "string"
            ? assignment.lessonId
            : (assignment.lessonId?._id || assignment.lessonId);
      }
    }

    res.render("submission_page", {
      Classroom: "",
      assignments: "",
      content: "",
      assignmentId: assignmentId || "",
      lessonId: lessonId || "",
      created: false,
      error: null
    });
  } catch (err) {
    console.error("[GET /submission/new] error:", err);
    res.status(500).render("submission_page", {
      assignmentId: req.query.assignmentId || "",
      lessonId: "",
      created: false,
      error: "Failed to load submission page."
    });
  }
});

router.post("/", requireLogin, async (req, res) => {
  try {
    const { assignmentId, answer } = req.body;

    if (!assignmentId || !answer || !answer.trim()) {
      return res.status(400).render("submission_page", {
        assignmentId: assignmentId || "",
        lessonId: "",
        created: false,
        error: "Please provide an answer before submitting."
      });
    }

    // ensure assignment exists (lessonId)
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res.status(404).render("submission_page", {
        assignmentId,
        lessonId: "",
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

    // mark the lesson as completed for this student
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

    // redirect back to the lesson
    const lessonIdForRedirect = lessonObjectId ? lessonObjectId.toString() : String(rawLessonId || "");
    return res.redirect(`/lessons/${lessonIdForRedirect}?submitted=1`);
  } catch (err) {
    console.error("[POST /submission] error:", err);
    return res.status(500).render("submission_page", {
      assignmentId: req.body.assignmentId || "",
      lessonId: "",
      created: false,
      error: "Failed to save submission. Please try again."
    });
  }
});

module.exports = router;
