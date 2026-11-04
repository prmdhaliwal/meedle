// routes/marking.js
const express = require("express");
const router = express.Router();
const Assignment = require("../models/assignments");
const Submission = require("../models/submission");
const User = require("../models/user");
const { Lesson } = require("../models/lesson"); // Changed to destructure
const Enrollment = require("../models/enrollment");

function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!global.currentUser || global.currentUser.role !== role) {
            return res.status(403).send("Teachers only");
        }
        next();
    };
}

// List all assignments for marking
router.get("/instructor/marking", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const assignments = await Assignment.find({}).lean();

        // Get submission counts for each assignment
        for (let assignment of assignments) {
            // Find the associated lesson to get course info
            const lesson = await Lesson.findById(assignment.lessonId).populate("course").lean();
            assignment.lesson = lesson;
            
            // Count how many students have been graded (marks not null)
            const submissionCount = await Submission.countDocuments({ 
                assignment: assignment._id,
                marks: { $ne: null }
            });
            
            // Get total number of students enrolled in this course
            let totalStudents = 0;
            if (lesson && lesson.course) {
                totalStudents = await Enrollment.countDocuments({ 
                    course: lesson.course._id 
                });
            }
            
            assignment.gradedCount = submissionCount;
            assignment.totalCount = totalStudents;
        }

        res.render("marking-list", {
            user: global.currentUser,
            assignments,
            msg: req.query.msg || ""
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading assignments");
    }
});

// View students for a specific assignment
router.get("/instructor/marking/:assignmentId", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId).lean();

        if (!assignment) {
            return res.status(404).send("Assignment not found");
        }

        // Get the lesson to find the course (lessonId is a string in your schema)
        const lesson = await Lesson.findById(assignment.lessonId).populate("course").lean();
        
        if (!lesson) {
            return res.redirect("/instructor/marking?msg=" + 
                encodeURIComponent("Lesson not found for this assignment"));
        }

        // Get all students enrolled in this course
        const enrollments = await Enrollment.find({ course: lesson.course._id })
            .populate("student")
            .lean();

        const students = enrollments.map(e => e.student).filter(Boolean);

        // Get existing submissions for this assignment
        const submissions = await Submission.find({ assignment: assignment._id }).lean();
        const submissionMap = {};
        submissions.forEach(sub => {
            submissionMap[sub.student.toString()] = sub;
        });

        // Combine student data with submission data
        const studentData = students.map(student => {
            const submission = submissionMap[student._id.toString()] || {};
            return {
                _id: student._id,
                name: student.name,
                email: student.email,
                marks: submission.marks !== undefined ? submission.marks : null,
                feedback: submission.feedback || "",
                submissionId: submission._id || null,
                gradedAt: submission.gradedAt || null
            };
        });

        res.render("marking-assignment", {
            user: global.currentUser,
            assignment,
            lesson,
            students: studentData,
            msg: req.query.msg || ""
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading marking page");
    }
});

// Submit marks for a student
router.post("/instructor/marking/:assignmentId/grade", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const { studentId, marks, feedback } = req.body;
        const assignmentId = req.params.assignmentId;

        // Validate marks
        const marksNum = parseFloat(marks);
        if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
            return res.redirect(`/instructor/marking/${assignmentId}?msg=` + 
                encodeURIComponent("Invalid marks. Must be between 0 and 100"));
        }

        // Update or create submission
        await Submission.updateOne(
            { assignment: assignmentId, student: studentId },
            {
                $set: {
                    marks: marksNum,
                    feedback: feedback || "",
                    gradedAt: new Date(),
                    gradedBy: global.currentUser._id
                }
            },
            { upsert: true }
        );

        res.redirect(`/instructor/marking/${assignmentId}?msg=` + 
            encodeURIComponent("Marks saved successfully"));
    } catch (err) {
        console.error(err);
        res.redirect(`/instructor/marking/${req.params.assignmentId}?msg=` + 
            encodeURIComponent("Error saving marks"));
    }
});

module.exports = router;
