// routes/lessons.js
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Course = require("../models/course");
const { Lesson } = require("../models/lesson");
const Enrollment = require("../models/enrollment");
const { Classroom } = require("../models/class");

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


function makeDraft(body = {}) {
  return {
    course: body.courseId || body.course || "",
    title: body.title || "",
    content: body.content || ""
  };
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatForDisplay(value) {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "";
}

function makeLockInfo(classroom, user) {
  const opensAt = parseDate(classroom && classroom.availableFrom);
  const closesAt = parseDate(classroom && classroom.availableUntil);

  const info = {
    locked: false,
    reason: "",
    opensAt,
    closesAt
  };

  if (!user || user.role !== "student") {
    return info;
  }

  const now = new Date();

  if (opensAt && now < opensAt) {
    info.locked = true;
    info.reason = "before";
  } else if (closesAt && now > closesAt) {
    info.locked = true;
    info.reason = "after";
  }

  return info;
}

// Create lessons
router.get("/instructor/lessons/new", requireLogin, requireRole("teacher"), async (req, res) => {
  const courses = await Course.find({}).lean();
  res.render("lesson-new", { user: global.currentUser, courses, error: null, created: req.query.created === "1" });
});

router.post("/instructor/lessons", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const { courseId, title, content } = req.body;

    if (!courseId || !title || !content) {
      const courses = await Course.find({}).lean();
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        error: "All fields are required.",
        created: false,
        lesson: makeDraft(req.body)
      });
    }

    const lesson = new Lesson({
      course: courseId,
      title,
      content
    });

    await lesson.save();
    return res.redirect("/instructor/lessons/new?created=1");
  } catch (err) {
    const courses = await Course.find({}).lean();
    return res.render("lesson-new", { user: global.currentUser, courses, error: "Could not create lesson.", created: false, lesson: makeDraft(req.body) });
  }
});

router.get("/courses/:id/lessons", requireLogin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) return res.status(404).send("Course not found");

    const lessons = await Lesson.find({ course: course._id })
      .sort({ createdAt: 1 })
      .lean();

    const classInfo = await Classroom.findOne({ course: course._id })
      .populate("instructor", "name email")
      .lean();

    const classLock = makeLockInfo(classInfo, global.currentUser);
    const opensText = formatForDisplay(classLock.opensAt);
    const closesText = formatForDisplay(classLock.closesAt);

    const decorated = lessons.map((lesson) => ({
      ...lesson,
      lockInfo: { ...classLock },
      isLocked: classLock.locked,
      opensText,
      closesText
    }));

    let decoratedWithFlags = decorated;
    if (global.currentUser?.role === "student" && lessons.length > 0) {
      const lessonIds = lessons.map(l => l._id);
      const completions = await LessonCompletion.find({
        student: global.currentUser._id,
        lesson: { $in: lessonIds }
      }).lean();
      const completedSet = new Set(completions.map(c => String(c.lesson)));
      decoratedWithFlags = decorated.map(l => ({
        ...l,
        isCompleted: completedSet.has(String(l._id))
      }));
    }

    return res.render("course-lessons", {
      user: global.currentUser,
      course,
      lessons: decoratedWithFlags,
      instructor: classInfo?.instructor || null
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});



// View lessons
router.get("/lessons/:id", requireLogin, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("course").lean();
    if (!lesson) return res.status(404).send("Lesson not found");

    const courseId = lesson.course?._id || lesson.course;
    const classInfo = await Classroom.findOne({ course: courseId }).lean();

    const lockInfo = makeLockInfo(classInfo, global.currentUser);
    lesson.lockInfo = lockInfo;
    lesson.opensText = formatForDisplay(lockInfo.opensAt);
    lesson.closesText = formatForDisplay(lockInfo.closesAt);

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
      isCompleted,
      lockInfo,
      canViewContent: !lockInfo.locked
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Edit lessons
router.get("/instructor/lessons/edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) {
      return res.redirect("/instructor/lessons/new?msg=Lesson%20not%20found");
    }
    const courses = await Course.find({}).lean();
    const draft = makeDraft({
      courseId: lesson.course,
      title: lesson.title,
      content: lesson.content
    });
    draft._id = lesson._id;
    res.render("lesson-new", {
      user: global.currentUser,
      courses,
      lesson: draft,
      error: null
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

router.post("/instructor/lessons/edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.redirect("/instructor/lessons/new?msg=Lesson%20not%20found");
    }
    const { courseId, title, content } = req.body;
    if (!courseId || !title || !content) {
      const courses = await Course.find({}).lean();
      const draft = makeDraft(req.body);
      draft._id = req.params.id;
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        lesson: draft,
        error: "All fields are required."
      });
    }

    lesson.course = courseId;
    lesson.title = title;
    lesson.content = content;

    await lesson.save();
    return res.redirect("/courses/" + lesson.course + "/lessons");
  } catch (err) {
    const courses = await Course.find({}).lean();
    const draft = makeDraft(req.body);
    draft._id = req.params.id;
    return res.render("lesson-new", {
      user: global.currentUser,
      courses,
      lesson: draft,
      error: "Could not update lesson."
    });
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
        res.status(500).send("Server error");
    }
});

// instructor lessons overview
router.get("/instructor/lessons-overview", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get lessons, could change to get only teacher's created lessons
    const lessons = await Lesson.find({}).lean();
    const courses = await Course.find({}).lean();

    res.render("lessons-overview", {
      lessons, 
      courses
    });
  } catch (err) {
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
    res.status(500).send("An error occurred while loading the lessons.");
  }
});



module.exports = router;

