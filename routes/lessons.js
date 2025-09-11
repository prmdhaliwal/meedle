// routes/lessons.js
const express = require("express");
const router = express.Router();

const Course = require("../models/course");
const Lesson = require("../models/lesson");

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

router.get("/instructor/lessons/new", requireLogin, requireRole("teacher"), async (req, res) => {
    const courses = await Course.find({}).lean();
    res.render("lesson-new", { user: global.currentUser, courses, error: null, created: req.query.created === "1" });
});

router.post("/instructor/lessons", requireLogin, requireRole("teacher"), async (req, res) => {
    try {
        const { courseId, title, content } = req.body

        const lesson = new Lesson({
            course: courseId,
            title,
            content
        })

        await lesson.save();
        return res.redirect("/instructor/lessons/new?created=1");
    }
    catch (err) {
        console.error(err);
    const courses = await Course.find({}).lean();
    return res.render("lesson-new", { user: global.currentUser, courses, error: "Could not create lesson.", created: false });
    }
});

module.exports = router;
