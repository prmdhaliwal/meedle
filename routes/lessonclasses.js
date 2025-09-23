const express = require("express");
const router = express.Router();
const { Classroom } = require("../models/class");
const { Lesson, ClassLesson } = require("../models/lesson");

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

router.get("/instructor/classes/:classId/assign-lesson", requireLogin, requireRole("teacher"), async(req, res) => {
    try {
        const { classId } = req.params;
        const msg = req.query.msg || "";

        const c = await Classroom.findById(classId)
            .populate("course instructor")
            .lean();

        if (!c) return res.status(404).send("Class not found");

        const [links, lessons] = await Promise.all([
            ClassLesson.find({ classroom: classId }).populate("lesson").lean(),
            Lesson.find({ course: c.course }).sort({ title: 1 }).lean()
        ]);

        const assignedIds = new Set(
            links
                .map(l => l.lesson && l.lesson._id)
                .filter(Boolean)
                .map(id => String(id))
        );

        const assignedLessons = lessons.filter(l => assignedIds.has(String(l._id)));
        const availableLessons = lessons.filter(l => !assignedIds.has(String(l._id)));

        res.render("class-lessons", {
            user: global.currentUser,
            c,
            assignedLessons,
            availableLessons,
            msg
        });
    }   catch (err) {
        console.error(err);
        res.status(500).send("Error loading lessons");
    }
});

// Assign a lesson to a class
router.post("/instructor/classes/:classId/assign", requireLogin, requireRole("teacher"), async(req, res) => {
    try {
        const { classId } = req.params;
        const { lessonId } = req.body;

        const c = await Classroom.findById(classId).lean();
        if (!c) return res.status(404).send("Class not found.");

        const lesson = await Lesson.findOne({ _id: lessonId, course: c.course }).lean();

        if (!lesson) {
            return res.redirect(`/instructor/classes/${classId}/manage-lessons?msg=` +
                          encodeURIComponent("Lesson not found for this unit"));
        }

        await ClassLesson.updateOne(
            { classroom: classId, lesson: lessonId},
            { $setOnInsert: { classroom: classId, lesson: lessonId } },
            { upsert: true }
        );

        res.redirect(`/instructor/classes/${classId}/manage-lessons?msg=` +
                 encodeURIComponent("Lesson assigned"));

    }   catch(err) {
        console.error(err);
        res.redirect(`/instructor/classes/${req.params.classId}/manage-lessons?msg=` +
                 encodeURIComponent("Error assigning lesson"));
    }
});

// Unassign a lesson from a class
router.post("/instructor/classes/:classId/unassign", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const { classId } = req.params;
        const { lessonId } = req.body;

        await ClassLesson.deleteOne({ classroom: classId, lesson: lessonId });

        res.redirect(`/instructor/classes/${classId}/manage-lessons?msg=` +
                    encodeURIComponent("Lesson unassigned"));
    } catch (err) {
        console.error(err);
        res.redirect(`/instructor/classes/${req.params.classId}/manage-lessons?msg=` +
                    encodeURIComponent("Error unassigning lesson"));
    }
});

module.exports = router;