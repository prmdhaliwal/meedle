const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    assignment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Assignment", 
        required: true 
    },
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    marks: { 
        type: Number, 
        min: 0, 
        max: 100,
        default: null // null means not yet graded
    },
    feedback: { 
        type: String, 
        default: "" 
    },
    submittedAt: { 
        type: Date, 
        default: null 
    },
    gradedAt: { 
        type: Date, 
        default: null 
    },
    gradedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }
}, { timestamps: true });

// Unique constraint: one submission per student per assignment
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);