const mongoose = require("mongoose");
const { Schema } = mongoose;

const ClassSchema = new Schema({
  course:     { type: Schema.Types.ObjectId, ref: "Course", required: true },
  title:      { type: String, required: true },         // FIT2101 — Fri 4pm
  term:       { type: String },                         // S2 2025
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

ClassSchema.index({ course: 1, title: 1 }, { unique: true });

const ClassEnrollmentSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  classroom:   { type: Schema.Types.ObjectId, ref: "Class", required: true }
}, { timestamps: true });

ClassEnrollmentSchema.index({ student: 1, classroom: 1 }, { unique: true });

// so we dont need multiple files

const Classroom = mongoose.models.Class || mongoose.model("Class", ClassSchema);
const ClassEnrollment = mongoose.models.ClassEnrollment || mongoose.model("ClassEnrollment", ClassEnrollmentSchema);

module.exports = { Classroom, ClassEnrollment };
