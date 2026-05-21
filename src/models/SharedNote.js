const mongoose = require('mongoose');

const sharedNoteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, default: '' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    attachments: [{
        url: String,
        filename: String,
        public_id: String,
        resource_type: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('SharedNote', sharedNoteSchema);