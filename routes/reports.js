const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/course");
const { Classroom } = require("../models/class");
const Enrollment = require("../models/enrollment");
const Enrollment = require("../models/enrollment");
const { Lesson } = require("../models/lesson");
const LessonCompletion = require("../models/lesson_completion");

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
            const enrollments = await Enrollment.find({ student: user._id })
                .populate({ path: "course", select: "title code description" })
                .lean();

            const courseIds = enrollments
                .map(enrollment => enrollment.course && enrollment.course._id)
                .filter(Boolean);

            const courseProgress = [];

            if (courseIds.length > 0) {
                const courseIdStrings = courseIds.map(id => id.toString());
                const enrolledCourseSet = new Set(courseIdStrings);

                const lessonsByCourse = await Lesson.aggregate([
                    { $match: { course: { $in: courseIds } } },
                    { $group: { _id: "$course", total: { $sum: 1 } } }
                ]);

                const lessonTotals = lessonsByCourse.reduce((acc, item) => {
                    acc[item._id.toString()] = item.total;
                    return acc;
                }, {});

                const completions = await LessonCompletion.find({ student: user._id })
                    .populate({ path: "lesson", select: "course" })
                    .lean();

                const completionTotals = completions.reduce((acc, completion) => {
                    const course = completion.lesson && completion.lesson.course;
                    if (!course) return acc;

                    const courseId = course.toString();
                    if (!enrolledCourseSet.has(courseId)) return acc;

                    acc[courseId] = (acc[courseId] || 0) + 1;
                    return acc;
                }, {});

                enrollments.forEach(enrollment => {
                    if (!enrollment.course) return;

                    const courseId = enrollment.course._id.toString();
                    const totalLessons = lessonTotals[courseId] || 0;
                    const completedLessons = completionTotals[courseId] || 0;
                    const percentComplete = totalLessons === 0
                        ? 0
                        : Math.round((completedLessons / totalLessons) * 100);

                    courseProgress.push({
                        id: courseId,
                        title: enrollment.course.title,
                        code: enrollment.course.code,
                        totalLessons,
                        completedLessons,
                        percentComplete
                    });
                });
            }

            res.render("report", { user, courseProgress });
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
                courseProgress: [],
                studentCount, 
                courseCount, 
                classCount,
                students
            });
        } else {
            // Invalid role or not logged in
            res.render("report", { user: null, courseProgress: [] });
        }
    } catch (error) {
        console.error("Error loading reports:", error);
        res.status(500).send("Error loading reports page");
    }
});

module.exports = router;
