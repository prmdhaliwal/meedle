const mongoose = require("mongoose");

// Minimal enrollment: which student is in which course
const EnrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course:  { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }
}, { timestamps: true });

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", EnrollmentSchema);