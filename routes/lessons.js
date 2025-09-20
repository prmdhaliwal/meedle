// routes/lessons.js
const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const Course = require("../models/course");
const Lesson = require("../models/lesson");
const Enrollment = require("../models/enrollment");
const Assignment = require("../models/assignments");
const LessonCompletion = require("../models/lesson_completion");
const Submission = require("../models/submission");

// Authentication
function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!global.currentUser || global.currentUser.role != role) {
            return res.status(403).send("Teachers only");
        }
        next();
    };
}


// Create lessons
router.get("/instructor/lessons/new", requireLogin, requireRole("teacher"), async (req, res) => {
    const courses = await Course.find({}).lean();
    res.render("lesson-new", { user: global.currentUser, courses, error: null, created: req.query.created === "1" });
});

router.post("/instructor/lessons", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const { courseId, title, content } = req.body

        const lesson = new Lesson({
            course: courseId,
            title,
            content
        })

        await lesson.save();
        return res.redirect("/instructor/lessons/new?created=1");
    }
    catch (err) {
        console.error(err);
    const courses = await Course.find({}).lean();
    return res.render("lesson-new", { user: global.currentUser, courses, error: "Could not create lesson.", created: false });
    }
});

// List lessons
router.get("/courses/:id/lessons", requireLogin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).send("Course not found");

    const lessons = await Lesson.find({ course: course._id })
      .sort({ createdAt: 1 })
      .lean();

    let lessonsWithFlag = lessons;

    // Completion for students
    if (global.currentUser && global.currentUser.role === "student" && lessons.length > 0) {
      const lessonIds = lessons.map(l => l._id);
      const completions = await LessonCompletion.find({
        student: global.currentUser._id,
        lesson: { $in: lessonIds }
      }).lean();

      const completedSet = new Set(completions.map(c => String(c.lesson)));
      lessonsWithFlag = lessons.map(l => ({
        ...l,
        isCompleted: completedSet.has(String(l._id))
      }));
    }

    res.render("course-lessons", {
      user: global.currentUser,
      course,
      lessons: lessonsWithFlag,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// View lessons
router.get("/lessons/:id", requireLogin, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("course").lean();
    if (!lesson) return res.status(404).send("Lesson not found");

    const assignments = await Assignment.find({ lessonId: String(lesson._id) }).lean();

    let isCompleted = false;
    if (global.currentUser && global.currentUser.role === "student") {
      const comp = await LessonCompletion.findOne({
        student: global.currentUser._id,
        lesson: lesson._id
      }).lean();
      isCompleted = !!comp;
    }

    let assignmentsWithFlag = assignments;
    if (global.currentUser && global.currentUser.role === "student" && assignments.length > 0) {
      const assignIds = assignments.map(a => a._id);
      const subs = await Submission.find({
        student: global.currentUser._id,
        assignment: { $in: assignIds }
      }).lean();
      const submittedSet = new Set(subs.map(s => String(s.assignment)));
      assignmentsWithFlag = assignments.map(a => ({
        ...a,
        isSubmitted: submittedSet.has(String(a._id))
      }));
    }

    return res.render("lesson-view", {
      user: global.currentUser,
      lesson,
      assignments: assignmentsWithFlag, 
      isCompleted
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



// View all students
router.get("/instructor/students", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
      // Get all the students
        const students = await User.find({
          $or: [
            { role: "student" },
            { isAdmin: false }
          ]
        }).lean();

        // For every student, get their enrolled courses
        for (let student of students) {
            const enrollments = await Enrollment.find({ student: student._id }).populate('course').lean();
            const courses = [];
            for (let enrollment of enrollments) {
                courses.push(enrollment.course.code);
            }
            student.courses = courses;
        }

        res.render("students-list", { students });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
