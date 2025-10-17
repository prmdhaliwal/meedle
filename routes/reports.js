const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/course");
const { Classroom } = require("../models/class");
const Enrollment = require("../models/enrollment");

// Check for login
function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
    next();
}

// Reports page
router.get("/reports", requireLogin, async (req, res) => {
    try {
        const user = global.currentUser;
        
        if (user.role === 'student') {
            // For students, just render the basic page
            res.render("report", { user });
        } else if (user.role === 'teacher') {
            // For teachers, get statistics and students list
            const studentCount = await User.countDocuments({ role: 'student' });
            const courseCount = await Course.countDocuments({});
            const classCount = await Classroom.countDocuments({});
            
            // Get all students and populate their courses
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
            
            res.render("report", { 
                user, 
                studentCount, 
                courseCount, 
                classCount,
                students
            });
        } else {
            // Invalid role or not logged in
            res.render("report", { user: null });
        }
    } catch (error) {
        console.error("Error loading reports:", error);
        res.status(500).send("Error loading reports page");
    }
});

module.exports = router;