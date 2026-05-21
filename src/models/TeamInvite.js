const mongoose = require('mongoose');

const teamInviteSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    email: { type: String, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now, expires: 604800 }
});

module.exports = mongoose.model('TeamInvite', teamInviteSchema);