const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email:    String,
  password: String,
  gender: String, 
  isAdmin:  { type: Boolean, default: false },
  role: { type: String, enum: ["student", "teacher"], default: "student" }
});

module.exports = mongoose.model("User", UserSchema);