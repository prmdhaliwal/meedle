const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  title: String,
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }, // one to one relationship with lessons
  submissions: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String, //text submission 
    grade: Number
  }],
  dueDate: Date,
});

module.exports = mongoose.model("Assignment", assignmentSchema);
