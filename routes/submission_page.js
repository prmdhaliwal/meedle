const express = require("express");
const router = express.Router();
const submission = require("../models/submission");
const { Classroom } = require("../models/class");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

router.get('/new', requireLogin, (req, res) => {
    res.render('basic_submission_page/new',{
        Classroom:"",
        assignments:"",
        content:""
    });
});

router.post