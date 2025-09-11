const mongoose = require('mongoose');

const SUbmissionSchema = new mongoose.Schema({
    student: { type: ObjectId, required: true},
    classroom: { type: ObjectId, required: true },
    assignment: { type: ObjectId, required: true },
    content: { type: String, required: true}
}, { timestamps: true });

SubmissionSchema.index({ lessonId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);