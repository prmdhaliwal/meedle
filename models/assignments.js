const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    weighting: { type: Number, required: true, min: 0, max: 100 },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true }
}, { timestamps: true });

AssignmentSchema.index({ title: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);