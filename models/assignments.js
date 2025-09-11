const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true},
    body: { type: String, required: true },
    weighting: { type: Number, required: true, min: 0, max: 100 },
    lessonId: { type: String, required: true }
}, { timestamps: true });

AssignmentSchema.index({ lessonId: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);