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

router.get("/classes", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classes = await Classroom.find({})
            .populate("course")
            .populate("instructor")
            .lean();

        classes.forEach((c) => {
            c.availableFromInput = formatForInput(c.availableFrom);
            c.availableUntilInput = formatForInput(c.availableUntil);
            c.availableFromText = formatForDisplay(c.availableFrom);
            c.availableUntilText = formatForDisplay(c.availableUntil);
        });

        res.render("instructor-classes", { user: global.currentUser, classes });
    } catch (err) {
        res.status(500).send("Error loading classes");
    }
});

router.post("/classes/:id/access", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).send("Class not found");
        }

        const openDate = parseDate(req.body.opensAt);
        const closeDate = parseDate(req.body.closesAt);

        if (req.body.opensAt && !openDate) {
            return res.status(400).send("Please enter a valid open time");
        }

        if (req.body.closesAt && !closeDate) {
            return res.status(400).send("Please enter a valid close time");
        }

        if (openDate && closeDate && closeDate < openDate) {
            return res.status(400).send("Close time must be after the open time");
        }

        classroom.availableFrom = openDate || null;
        classroom.availableUntil = closeDate || null;
        await classroom.save();

        return res.redirect("/instructor/classes");
    } catch (err) {
        return res.status(500).send("Could not update access window");
    }
});

router.post("/classes/:id/access", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) {
            return res.status(404).send("Class not found");
        }

        const openDate = parseDate(req.body.opensAt);
        const closeDate = parseDate(req.body.closesAt);

        if (req.body.opensAt && !openDate) {
            return res.status(400).send("Please enter a valid open time");
        }

        if (req.body.closesAt && !closeDate) {
            return res.status(400).send("Please enter a valid close time");
        }

        if (openDate && closeDate && closeDate < openDate) {
            return res.status(400).send("Close time must be after the open time");
        }

        classroom.availableFrom = openDate || null;
        classroom.availableUntil = closeDate || null;
        await classroom.save();

        return res.redirect("/instructor/classes");
    } catch (err) {
        return res.status(500).send("Could not update access window");
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
