const mongoose = require("mongoose");

// Basic schema for a lesson
const LessonSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }
}, {timestamps: true});

LessonSchema.index({ course: 1, title: 1 }, { unique: true });

module.exports = mongoose.model("Lesson", LessonSchema);