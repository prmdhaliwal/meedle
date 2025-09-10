const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  content: String, // lesson content. Literally just text
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" } // one assignment per lesson
});

module.exports = mongoose.model("Lesson", lessonSchema);