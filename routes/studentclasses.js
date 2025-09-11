const express = require("express");
const router = express.Router();
const { ClassEnrollment } = require("../models/class");


function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

//show all the classes that a student is enrolled in
router.get("/classes", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;

    // find the students classes and fill them out
    const enrolls = await ClassEnrollment
      .find({ student: me._id })
      .populate({ path: "studentclasses", populate: { path: "course", model: "Course" } })
      .lean();

    const classes = enrolls.map(e => {
      const c = e.studentclasses;
      const course = c?.course || {};
      return {
        id: c?._id?.toString() || "",
        title: c?.title || "(Untitled class)",
        term: c?.term || "",
        courseCode: course?.code || "",
        courseTitle: course?.title || ""
      };
    });

    res.render("student-classes", { user: me, classes });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading classes");
  }
});

module.exports = router;
