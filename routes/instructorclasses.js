const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { Classroom, ClassEnrollment } = require("../models/class");

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

router.get("/classes", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classes = await Classroom.find({})
            .populate("course")
            .populate("instructor")
            .lean();

        res.render("instructor-classes", { user: global.currentUser, classes });
    }   catch (err) {
        res.status(500).send("Error loading classes");
    }
});

// get students 
router.get("/classes/:id/assign-students", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
      const classId = req.params.id;
      const allStudents = await User.find({ role: "student" }).lean();
      const assignedEnrollments = await ClassEnrollment.find({ studentclass: classId }).populate("student").lean();

      const assignedStudents = assignedEnrollments.map(e => e.student);
      const unavailableEnrollments = await ClassEnrollment.find().populate("student").lean();
      const unavailableIds = new Set(unavailableEnrollments.map(e => e.student._id.toString()));
      const availableStudents = allStudents.filter(s => !unavailableIds.has(s._id.toString()));
  
      const c = await Classroom.findById(classId).lean();
  
      res.render("class-students", {
        assignedStudents,
        availableStudents,
        c
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading students");
    }
  });

  // assign a student to a class
  router.post("/classes/:id/assign-students", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classId = req.params.id;
        const { studentId } = req.body;
        
        const exists = await ClassEnrollment.findOne({ student: studentId, studentclass: classId });
        if (!exists) {
        await ClassEnrollment.create({ student: studentId, studentclass: classId });
        }

        res.redirect(`/instructor/classes/${classId}/assign-students`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error assigning student");
      }
  });

  // unassign a student to a class
  router.post("/classes/:id/unassign-students", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classId = req.params.id;
        const { studentId } = req.body;
        
        const exists = await ClassEnrollment.findOne({ student: studentId, studentclass: classId });
        if (exists) {
        await ClassEnrollment.deleteOne({ student: studentId, studentclass: classId });
        }

        res.redirect(`/instructor/classes/${classId}/assign-students`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error assigning student");
      }
  });
  
  

module.exports = router;