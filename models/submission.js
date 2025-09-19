const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const SubmissionSchema = new Schema(
  {
    student:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    answer:     { type: String, required: true },
    submittedAt:{ type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = model("Submission", SubmissionSchema);
