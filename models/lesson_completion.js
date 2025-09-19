const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const LessonCompletionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lesson:  { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// one completion per (student, lesson)
LessonCompletionSchema.index({ student: 1, lesson: 1 }, { unique: true });

module.exports = model("LessonCompletion", LessonCompletionSchema);
