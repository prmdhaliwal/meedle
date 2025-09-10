const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    name: String,
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // single teacher for the class
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // array of students for the class
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" } // single lesson for the class
});

module.exports = mongoose.model("Class", classSchema);