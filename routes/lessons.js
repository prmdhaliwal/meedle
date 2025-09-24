// routes/lessons.js
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Course = require("../models/course");
const Lesson = require("../models/lesson");
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
    content: body.content || "",
    availableFrom: body.availableFrom || "",
    availableUntil: body.availableUntil || ""
  };
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatForInput(value) {
  const date = parseDate(value);
  if (!date) return "";

  const two = (part) => String(part).padStart(2, "0");
  const year = date.getFullYear();
  const month = two(date.getMonth() + 1);
  const day = two(date.getDate());
  const hours = two(date.getHours());
  const minutes = two(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatForDisplay(value) {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "";
}

function makeLockInfo(lesson, user) {
  const info = {
    locked: false,
    reason: "",
    opensAt: parseDate(lesson.availableFrom),
    closesAt: parseDate(lesson.availableUntil)
  };

  if (!user || user.role !== "student") {
    return info;
  }

  const now = new Date();

  if (info.opensAt && now < info.opensAt) {
    info.locked = true;
    info.reason = "before";
  } else if (info.closesAt && now > info.closesAt) {
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
    const { courseId, title, content, availableFrom, availableUntil } = req.body;

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

    let openAt = parseDate(availableFrom);
    if (availableFrom && !openAt) {
      const courses = await Course.find({}).lean();
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        error: "Please enter a valid open time.",
        created: false,
        lesson: makeDraft(req.body)
      });
    }

    let closeAt = parseDate(availableUntil);
    if (availableUntil && !closeAt) {
      const courses = await Course.find({}).lean();
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        error: "Please enter a valid close time.",
        created: false,
        lesson: makeDraft(req.body)
      });
    }

    if (openAt && closeAt && closeAt < openAt) {
      const courses = await Course.find({}).lean();
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        error: "Close time must be after the open time.",
        created: false,
        lesson: makeDraft(req.body)
      });
    }

    const lesson = new Lesson({
      course: courseId,
      title,
      content,
      availableFrom: openAt || undefined,
      availableUntil: closeAt || undefined
    });

    await lesson.save();
    return res.redirect("/instructor/lessons/new?created=1");
  } catch (err) {
    console.error(err);
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

    // add lock info
    const decorated = lessons.map((l) => {
      const info = makeLockInfo(l, global.currentUser);
      return {
        ...l,
        lockInfo: info,
        isLocked: info.locked,
        opensText: formatForDisplay(info.opensAt),
        closesText: formatForDisplay(info.closesAt)
      };
    });

    // add completion flags for students
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

    // instructor info for the course
    const classInfo = await Classroom.findOne({ course: course._id })
      .populate("instructor", "name email")
      .lean();

    return res.render("course-lessons", {
      user: global.currentUser,
      course,
      lessons: decoratedWithFlags,           // <-- single, correct array
      instructor: classInfo?.instructor || null
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

    const lockInfo = makeLockInfo(lesson, global.currentUser);
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
    console.error(err);
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
      content: lesson.content,
      availableFrom: formatForInput(lesson.availableFrom),
      availableUntil: formatForInput(lesson.availableUntil)
    });
    draft._id = lesson._id;
    res.render("lesson-new", {
      user: global.currentUser,
      courses,
      lesson: draft,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/instructor/lessons/edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.redirect("/instructor/lessons/new?msg=Lesson%20not%20found");
    }
    const { courseId, title, content, availableFrom, availableUntil } = req.body;
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

    let openAt = parseDate(availableFrom);
    if (availableFrom && !openAt) {
      const courses = await Course.find({}).lean();
      const draft = makeDraft(req.body);
      draft._id = req.params.id;
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        lesson: draft,
        error: "Please enter a valid open time."
      });
    }

    let closeAt = parseDate(availableUntil);
    if (availableUntil && !closeAt) {
      const courses = await Course.find({}).lean();
      const draft = makeDraft(req.body);
      draft._id = req.params.id;
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        lesson: draft,
        error: "Please enter a valid close time."
      });
    }

    if (openAt && closeAt && closeAt < openAt) {
      const courses = await Course.find({}).lean();
      const draft = makeDraft(req.body);
      draft._id = req.params.id;
      return res.render("lesson-new", {
        user: global.currentUser,
        courses,
        lesson: draft,
        error: "Close time must be after the open time."
      });
    }

    lesson.course = courseId;
    lesson.title = title;
    lesson.content = content;
    lesson.availableFrom = openAt || undefined;
    lesson.availableUntil = closeAt || undefined;

    await lesson.save();
    return res.redirect("/courses/" + lesson.course + "/lessons");
  } catch (err) {
    console.error(err);
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
        console.error(err);
        res.status(500).send("Server error");
    }
});



module.exports = router;

