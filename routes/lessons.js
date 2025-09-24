// routes/lessons.js
const express = require("express");
const router = express.Router();
const User = require("../models/User"); 
const Course = require("../models/course");
const Lesson = require("../models/lesson");
const Enrollment = require("../models/enrollment");


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

    res.render("course-lessons", {
      user: global.currentUser,
      course,
      lessons,
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

    res.render("lesson-view", {
      user: global.currentUser,
      lesson,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// View all students
router.get("/instructor/students", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
      // See if there is a success message to display
      const successMessage = req.query.successMessage;

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

        if (!successMessage) {
          res.render("students-list", { students });
        } else {
          res.render("students-list", { students, successMessage }); 
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});



module.exports = router;
