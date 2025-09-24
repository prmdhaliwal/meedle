// routes/studentcourses.js
const express = require("express");
const router = express.Router();
require("../models/course"); // register Course model
const Enrollment = require("../models/enrollment");
const Course = require("../models/course");
const studentcourses = require("../routes/studentcourses");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

router.get("/manage-enrollments", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;

    const [courses, enrolls] = await Promise.all([
      Course.find({}).lean(),
      Enrollment.find({ student: me._id }).lean(),
    ]);

    const enrolledIds = new Set(enrolls.map(e => String(e.course)));
    const msg = req.query.msg || "";

    res.render("manage-enrollments", { user: me, courses, enrolledIds, msg });
  } catch (err) {
    res.status(500).send("Server error");
  }
});


router.get("/courses", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const enrolls = await Enrollment.find({ student: me._id }).populate("course").lean();
    const courses = enrolls.map(e => e.course).filter(Boolean);
    res.render("student-courses", { user: me, courses });
  } catch (err) {
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
    res.status(500).json({ error: "Server error" });
  }
});

// sending stuff back to MONGODB
//enrolling 
router.post("/enroll", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const { courseCode } = req.body;

    const course = await Course.findOne({ code: courseCode });
    if (!course) return res.redirect("/student/manage-enrollments?msg=Course%20not%20found");

    await Enrollment.updateOne(
      { student: me._id, course: course._id },
      { $setOnInsert: { student: me._id, course: course._id } },
      { upsert: true }
    );

    return res.redirect("/student/manage-enrollments?msg=Enrolled%20in%20" + encodeURIComponent(course.code));
  } catch (err) {
    return res.redirect("/student/manage-enrollments?msg=Error%20enrolling");
  }
});

// unenrolling
router.post("/unenroll", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const { courseId } = req.body;

    await Enrollment.deleteOne({ student: me._id, course: courseId });

    return res.redirect("/student/manage-enrollments?msg=Unenrolled");
  } catch (err) {
    return res.redirect("/student/manage-enrollments?msg=Error%20unenrolling");
  }
});
module.exports = router;