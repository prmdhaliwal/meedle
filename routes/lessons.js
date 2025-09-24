// routes/lessons.js
const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/course");
const Lesson = require("../models/lesson");
const Enrollment = require("../models/enrollment");
const { Classroom } = require("../models/class"); // Move this to the top

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
    const { courseId, title, content } = req.body;

    const lesson = new Lesson({
      course: courseId,
      title,
      content
    });

    await lesson.save();
    return res.redirect("/instructor/lessons/new?created=1");
  } catch (err) {
    console.error(err);
    const courses = await Course.find({}).lean();
    return res.render("lesson-new", { user: global.currentUser, courses, error: "Could not create lesson.", created: false });
  }
});

// List lessons - This route looks correct now!
router.get("/courses/:id/lessons", requireLogin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).send("Course not found");

    const lessons = await Lesson.find({ course: course._id })
      .sort({ createdAt: 1 })
      .lean();

    // Find the class/instructor for this course - This is correct!
    const classInfo = await Classroom.findOne({ course: course._id })
      .populate("instructor", "name email")
      .lean();

    res.render("course-lessons", {
      user: global.currentUser,
      course,
      lessons,
      instructor: classInfo?.instructor || null // This fixes the error!
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

// instructor lessons overview
router.get("/instructor/lessons-overview", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get lessons, could change to get only teacher's created lessons
    const lessons = await Lesson.find({}).lean();
    const courses = await Course.find({}).lean();

    console.log("Lessons fetched:", lessons);
    res.render("lessons-overview", {
      lessons, 
      courses
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading the lessons.");
  }
});

// instructor edit lessons (edit form needs to be created)
router.get("/instructor/lessons/edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get lessons, could change to get only teacher's created lessons
    const lesson = await Lesson.findById(req.params.id).lean();
    const courses = await Course.find({}).lean();

    if (!lesson) {
      return res.redirect("/instructor/lessons/new?msg=Lesson%20not%20found");
    }

    res.render("lesson-new", {
      user: global.currentUser,
      lesson, 
      courses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading the form.");
  }
});

// POST route to update a lesson
router.post("/instructor/lessons/edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const { courseId, title, content} = req.body;
    const lesson = await Lesson.findOne({ _id: new ObjectId(req.params.id) }).lean();
    const courses = await Course.find({}).lean();

    // Validate input
    if (!title || !courseId|| !content) {

      
      return res.render("lesson-new", {
        user: global.currentUser,
        lesson: {...lesson, ...req.body},
        courses,
        error: "All fields are required."
      });
    }

    // Update the lesson
    const result = await Lesson.updateOne(
      { 
        _id: req.params.id
      },
      { $set: { courseId, title, content} }
    );

    if (result.matchedCount === 0) {
      return res.redirect("/instructor/lessons/new?error=Lesson not found");
    }

    return res.redirect("/instructor/lessons-overview/?msg=Lesson updated successfully");
  } catch (err) {
    console.error(err);
    
    const lessons = await Lesson.find({}).lean();
    const courses = await Course.find({}).lean();
    return res.render("lesson-new", { 
      user: global.currentUser, 
      lessons, 
      courses,
      error: "Could not update lesson.", 
      assignment: req.body
    });
  }
});

// instructor delete lessons
router.post("/instructor/lessons/delete/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get lesson to delete, could change to get only teacher's created lessons
    const lesson = await Lesson.deleteOne({ _id: req.params.id });

    if (lesson.deletedCount === 0) {
      return res.redirect("/instructor/lessons-overview?error=Lesson not found");
    }

    return res.redirect("/instructor/lessons-overview?msg=Lesson deleted successfully");

    
  } catch (err) {
    res.render("lessons-overview", {
      lessons, 
    });
    console.error(err);
    res.status(500).send("An error occurred while loading the lessons.");
  }
});


module.exports = router;
