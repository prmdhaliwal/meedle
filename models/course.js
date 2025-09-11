const mongoose = require("mongoose");


const CourseSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" }
}, { timestamps: true });

CourseSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("Course", CourseSchema);