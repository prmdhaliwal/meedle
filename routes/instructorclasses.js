const express = require("express");
const router = express.Router();
const { Classroom } = require("../models/class");

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
        console.error(err);
        res.status(500).send("Error loading classes");
    }
});

module.exports = router;