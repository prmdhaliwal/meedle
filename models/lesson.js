const mongoose = require("mongoose");
const { Schema } = mongoose;

// Basic schema for a lesson
const LessonSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }
}, {timestamps: true});

const ClassLessonSchema = new mongoose.Schema({
    classroom: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true }
}, {timestamps: true});

LessonSchema.index({ course: 1, title: 1 }, { unique: true });
ClassLessonSchema.index({ classroom: 1, lesson: 1}, { unique: true});

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
const ClassLesson = mongoose.models.ClassLesson || mongoose.model("ClassLesson", ClassLessonSchema);

module.exports = { Lesson, ClassLesson };