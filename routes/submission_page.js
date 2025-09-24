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
router.get("/new", requireLogin, async (req, res) => {
  try {
    const { assignmentId } = req.query;

    let lessonId = "";
    let alreadySubmitted = false;

    if (assignmentId) {
      const assignment = await Assignment.findById(assignmentId).lean();
      if (assignment) {
        lessonId = typeof assignment.lessonId === "string"
          ? assignment.lessonId
          : (assignment.lessonId?._id || assignment.lessonId);

        // has this student already submitted?
        const existing = await Submission.findOne({
          student: global.currentUser._id,
          assignment: assignmentId
        }).lean();
        alreadySubmitted = !!existing;
      }
    }

    res.render("submission_page", {
      Classroom: "",
      assignments: "",
      content: "",
      assignmentId: assignmentId || "",
      lessonId: lessonId || "",
      alreadySubmitted,
      created: false,
      error: null
    });
  } catch (err) {
    console.error("[GET /submission/new] error:", err);
    res.status(500).render("submission_page", {
      assignmentId: req.query.assignmentId || "",
      lessonId: "",
      alreadySubmitted: false,
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
        alreadySubmitted: false,
        created: false,
        error: "Please provide an answer before submitting."
      });
    }

    // ensure assignment exists 
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res.status(404).render("submission_page", {
        assignmentId,
        lessonId: "",
        alreadySubmitted: false,
        created: false,
        error: "Assignment not found."
      });
    }

    // prevent a second submission
    const exists = await Submission.findOne({
      student: global.currentUser._id,
      assignment: assignmentId
    }).lean();
    const rawLessonId = assignment.lessonId && (typeof assignment.lessonId === "string"
      ? assignment.lessonId
      : (assignment.lessonId?._id || assignment.lessonId));
    const lessonIdForRedirect = rawLessonId ? String(rawLessonId) : "";

    if (exists) {
      return res.redirect(`/lessons/${lessonIdForRedirect}?alreadySubmitted=1`);
    }

    // save submission
    await Submission.create({
      student: global.currentUser._id,
      assignment: assignmentId,
      answer: answer.trim()
    });

    // mark the lesson as complete
    const lessonObjectId = mongoose.Types.ObjectId.isValid(rawLessonId)
      ? new mongoose.Types.ObjectId(rawLessonId)
      : null;

    await LessonCompletion.updateOne(
      { student: global.currentUser._id, lesson: lessonObjectId || rawLessonId },
      { $setOnInsert: { completedAt: new Date() } },
      { upsert: true }
    );

    // redirect back to the lesson
    return res.redirect(`/lessons/${lessonIdForRedirect}?submitted=1`);
  } catch (err) {

    if (err && err.code === 11000) {
      const assignmentId = req.body.assignmentId || "";
      const assignment = assignmentId ? await Assignment.findById(assignmentId).lean() : null;
      const rawLessonId = assignment && (typeof assignment.lessonId === "string"
        ? assignment.lessonId
        : (assignment.lessonId?._id || assignment.lessonId));
      const lessonIdForRedirect = rawLessonId ? String(rawLessonId) : "";
      return res.redirect(`/lessons/${lessonIdForRedirect}?alreadySubmitted=1`);
    }

    console.error("[POST /submission] error:", err);
    return res.status(500).render("submission_page", {
      assignmentId: req.body.assignmentId || "",
      lessonId: "",
      alreadySubmitted: false,
      created: false,
      error: "Failed to save submission. Please try again."
    });
  }
});

module.exports = router;
