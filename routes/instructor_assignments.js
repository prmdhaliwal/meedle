// routes/assignments.js
const express = require("express");
const router = express.Router();
require("../models/assignments"); 
const Assignment = require("../models/assignments");
const Lesson = require("../models/lesson");
const constants = require("constants");

// check for login
function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
    next();
  }

  // check to see if user has the instructor role
function requireRole(role) {
    return (req, res, next) => {
        if (!global.currentUser || global.currentUser.role != role) {
            return res.status(403).send("Teachers only");
        }
        next();
    };
}

// get assignments creation page
router.get("/instructor/assignments-edit", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get assignments 
    const assignments = await Assignment.find({}).lean();
    const lessons = await Lesson.find({}).lean();

    res.render("assignments-edit", {
      user: global.currentUser,
      assignments, 
      created: false, 
      lessons,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading the assignments.");
  }
});

// post new assignment
router.post("/instructor/assignments-edit", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const { title, body, weighting, lessonId } = req.body;

    // validate input
    if (!title || !body || !weighting || !lessonId) {
      const assignments = await Assignment.find({ teacher: global.currentUser._id }).lean();
      return res.render("assignments-edit", {
        user: global.currentUser,
        assignments,
        error: "All fields are required.",
        created: false,
      });
    }

    // create a new assignment, lessonID needs to be unique.
    // in the future, will change this to be linked directly to a lesson
    const assignment = new Assignment({
      title,
      body,
      weighting,
      lessonId,
      teacher: global.currentUser._id,
    });

    await assignment.save();

    return res.redirect("/instructor/assignments?msg=Assignment%20added");
  } catch (err) {
    console.error(err);

    // check for duplicate key error (MongoDB error code 11000)
    if (err.code === 11000) {
      const assignments = await Assignment.find({ teacher: global.currentUser._id }).lean();
      return res.render("assignments-edit", {
        user: global.currentUser,
        assignments,
        error: "Duplicate entry: An assignment with the same title or lesson ID already exists.",
        created: false,
      });
    }
    const assignments = await Assignment.find({}).lean();
    return res.render("assignments-edit", { user: global.currentUser, assignments, error: "Could not create assignment.", created: false });
  }
});

router.get("/instructor/assignments", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    // get assignments, could change to get only teacher's created assignments
    const assignments = await Assignment.find({}).lean();
    const lessons = await Lesson.find({}).lean();

    console.log("Assignments fetched:", assignments);
    res.render("assignments", {
      assignments, 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading the assignments.");
  }
});

const { ObjectId } = require("mongodb");

// delete assignment
router.post("/instructor/assignments-delete/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const assignmentId = req.params.id;

    
    await Assignment.deleteOne({
      _id: assignmentId,
    });

    return res.redirect("/instructor/assignments?msg=Assignment%20deleted");
  } catch (err) {
    console.error(err);
    return res.redirect("/instructor/assignments?msg=Error%20deleting%20assignment");
  }
});

// GET route to show edit form
router.get("/instructor/assignments-edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const lessons = await Lesson.find({}).lean();
    const assignment = await Assignment.findById(req.params.id).lean();
    
    if (!assignment) {
      return res.redirect("/instructor/assignments?error=Assignment not found");
    }
    
    res.render("assignments-edit", {
      user: global.currentUser,
      assignment, 
      lessons
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading the form.");
  }
});

// POST route to update an assignment
router.post("/instructor/assignments-edit/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    const { title, body, weighting, lessonId } = req.body;
    const assignment = await Assignment.findOne({ _id: new ObjectId(req.params.id) }).lean();

    // Validate input
    if (!title || !body || !weighting || !lessonId) {
      const lessons = await Lesson.find({}).lean();
      
      return res.render("assignments-edit", {
        user: global.currentUser,
        assignment: {...assignment, ...req.body},
        error: "All fields are required."
      });
    }

    // Update the assignment
    const result = await Assignment.updateOne(
      { 
        _id: req.params.id
      },
      { $set: { title, body, weighting, lessonId } }
    );

    if (result.matchedCount === 0) {
      return res.redirect("/instructor/assignments?error=Assignment not found");
    }

    return res.redirect("/instructor/assignments?msg=Assignment updated successfully");
  } catch (err) {
    console.error(err);
    
    const lessons = await Lesson.find({}).lean();
    return res.render("assignments-edit", { 
      user: global.currentUser, 
      lessons, 
      error: "Could not update assignment.", 
      assignment: req.body
    });
  }
});


module.exports = router;