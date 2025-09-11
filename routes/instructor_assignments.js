// routes/assignments.js
const express = require("express");
const router = express.Router();
require("../models/assignments"); 
const Assignment = require("../models/assignments");
const Lesson = require("../models/lesson");
const constants = require("constants");

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

router.get("/instructor/assignments-edit", (req, res) => {
  res.render("assignments-edit");
});

router.get("/instructor/assignments", requireLogin, requireRole("teacher"), async (req, res) => {
  const assignments = await Assignment.find({ teacher: global.currentUser._id }).lean();
});

router.post("/instructor/assignments-edit", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const { title, description, weighting, lessonId } = req.body;

    const assignment = new Assignment({
      title,
      description,
      weighting,
      lessonId,
    })

      await assignment.save();
      return res.redirect("/instructor/assignments?msg=Assignment%20added");
    }

    catch (err) {
      console.error(err);
    const assignments = await Assignment.find({}).lean();
    return res.redirect("/instructor/assignments?msg=Error%20adding%20assignment");
  }
});

//delete assignment
router.post("/delete", requireLogin, requireRole("teacher"), async (req, res) => {
  try{
    const me = global.currentUser;
    const {assignmentId} = req.body;

    await Assignment.deleteOne({_id: new ObjectId(assignmentId), student: me._id});

    return res.redirect ("/instructor/assignments?msg=Assignment%20deleted");
  } catch (err) {
    console.error(err);
    return res.redirect("/instructor/assignments?msg=Error%20deleting%20assignment");

  }
});


module.exports = router;