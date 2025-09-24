const express = require("express");
const router = express.Router();
const { ClassEnrollment, Classroom } = require("../models/class");


function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

//show all the classes that a student is enrolled in
router.get("/classes", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;

    // find the students classes, fill them out and populate instructor information
    const enrolls = await ClassEnrollment
      .find({ student: me._id })
      .populate({ 
        path: "classroom", 
        populate: [
          { path: "course", model: "Course" },
          { path: "instructor", model: "User", select: "name email"}
        ]
      })
      .lean();

    const classes = enrolls.map(e => {
      const c = e.classroom;
      const course = c?.course || {};
      const instructor = c?.instructor || {};
      return {
        id: c?._id?.toString() || "",
        title: c?.title || "(Untitled class)",
        term: c?.term || "",
        courseCode: course?.code || "",
        courseTitle: course?.title || "",
        instructorName: instructor?.name || "TBA",
        instructorEmail: instructor?.email || ""
      };
    });

    res.render("student-classes", { user: me, classes });
  } catch (err) {
    res.status(500).send("Error loading classes");
  }
});

module.exports = router;
