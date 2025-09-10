const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email:    String,
  password: String,
  gender: String, 
  isAdmin:  { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);