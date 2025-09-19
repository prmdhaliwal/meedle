const express = require("express");
const router = express.Router();
const submission = require("../models/submission");
const { Classroom } = require("../models/class");

function requireLogin(req, res, next) {
  if (!global.currentUser) return res.redirect("/auth/login");
  next();
}

router.get('/new', requireLogin, (req, res) => {
  const { assignmentId } = req.query;
  res.render('submission_page', { 
    Classroom: "",
    assignments: "",
    content: "",
    assignmentId: assignmentId || ""
  });
});

module.exports = router;