const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Class = require("../models/class");
const Lesson = require("../models/lesson");
const Assignment = require("../models/assignment");


// router.get("/", async function(req, res) {
//     const currentUser = global.getCurrentUser();
//     if (!currentUser || currentUser.role !== "student") {
//         return res.redirect("/auth/login");
//     }

//     // Find classes the student is enrolled in
//     const classes = await Class.find({ students: currentUser._id }).populate('teacher').populate({
//         path: 'lessons',
//         populate: { path: 'assignments' }
//     });

//     res.render("student", { user: currentUser, classes });
// });

router.get("/", function(req, res) {
    res.send("STUDENT DASHBOARD");
});


module.exports = router;