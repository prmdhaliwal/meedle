// routes/assignments.js
const express = require("express");
const router = express.Router();
require("../models/assignments"); 
const Assignment = require("../models/assignments");

function requireLogin(req, res, next) {
    if (!global.currentUser) return res.redirect("/auth/login");
    next();
  }

router.get("/assignments", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const assignments = await Assignment.find({}).lean();

    res.render  ("assignments", { user: me, assignments });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

router.get("/assignments-edit", requireLogin, (req, res) => {
  res.render("/assignments-edit", { user: global.currentUser });
});

// sending stuff back to MONGODB
//new assignment
router.post("/newAssignment", requireLogin, async (req, res) => {
  try {
    const me = global.currentUser;
    const { title, description, weighting, lessonId } = req.body;
    const newAssignment = new Assignment({
      student: me._id,
      title,
      description,
      weighting,
      lessonId,
    });

    await newAssignment.save();

    return res.redirect("/assignments?msg=Assignment%20added");
  } catch (err) {
    console.error(err);
    return res.redirect("/assignments?msg=Error%20adding%20assignment");
  }
});

//delete assignment
router.post("/delete", requireLogin, async (req, res) => {
  try{
    const me = global.currentUser;
    const {assignmentId} = req.body;

    await Assignment.deleteOne({_id: new ObjectId(assignmentId), student: me._id});

    return res.redirect ("/assignments?msg=Assignment%20deleted");
  } catch (err) {
    console.error(err);
    return res.redirect("/assignments?msg=Error%20deleting%20assignment");

  }
});


module.exports = router;