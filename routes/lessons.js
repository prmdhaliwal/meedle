// routes/lessons.js
const express = require("express");
const router = express.Router();

const Course = require("../models/course");
const Lesson = require("../models/lesson");

function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

function requireAdmin(req, res, next) {
    if (!global.currentUser || !global.currentUser.isAdmin) {
        return res.status(403).send("Admins only");
    }
    next();
}
