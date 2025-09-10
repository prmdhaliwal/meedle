const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email:    String,
  password: String,
  gender: String, 
  role: {type: String, enum: ["student", "teacher"], default: "student", required: true},
});

module.exports = mongoose.model("User", UserSchema);