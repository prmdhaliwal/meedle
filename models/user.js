const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email:    String,
  password: {
        type: String,
        required: true,
        validate: {
            validator: function(value) {
                // https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
            },
            message: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character."
        },
    },
  gender: String, 
  isAdmin:  { type: Boolean, default: false },
  role: { type: String, enum: ["student", "teacher"], default: "student" },
  courses: [], //for now it's just an array of course names
});

module.exports = mongoose.model("User", UserSchema);