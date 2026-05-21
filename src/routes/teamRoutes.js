const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const SharedNote = require('../models/SharedNote');
const TeamInvite = require('../models/TeamInvite');
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');

// Generate random invite code
function generateInviteCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ============ TEAM ROUTES ============

// GET - All teams page
router.get('/', requireAuth, async (req, res) => {
    try {
        const teams = await Team.find({ 'members.user': req.userId })
            .populate('members.user', 'name email');
        
        // Filter robustly by ensuring member.user exists
        const myTeams = teams.filter(t => 
            t.members.some(m => m.user && m.user._id && m.user._id.toString() === req.userId && m.role === 'admin')
        );
        const joinedTeams = teams.filter(t => 
            t.members.some(m => m.user && m.user._id && m.user._id.toString() === req.userId && m.role === 'member')
        );
        
        // Get pending invites
        const pendingInvites = await TeamInvite.find({ 
            email: req.user.email, 
            status: 'pending' 
        }).populate('team', 'name icon');
        
        res.render('teams', { 
            myTeams, 
            joinedTeams,
            pendingInvites,
            user: req.user 
        });
    } catch (error) {
        console.error("Error loading teams:", error);
        res.status(500).send("Error loading teams");
    }
});

// GET - Create team form
router.get('/create', requireAuth, (req, res) => {
    res.render('create-team', { user: req.user });
});

// POST - Create team
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        
        if (!name) {
            return res.status(400).send("Team name is required");
        }
        
        const team = new Team({
            name: name,
            description: description || '',
            icon: icon || '👥',
            createdBy: req.userId,
            members: [{ user: req.userId, role: 'admin', joinedAt: new Date() }],
            inviteCode: generateInviteCode()
        });
        
        await team.save();
        res.redirect(`/teams/${team._id}`);
    } catch (error) {
        console.error("Error creating team:", error);
        res.status(500).send("Error creating team: " + error.message);
    }
});

// GET - Join team via invite code
router.get('/join/:inviteCode', requireAuth, async (req, res) => {
    try {
        const team = await Team.findOne({ inviteCode: req.params.inviteCode });
        
        if (!team) return res.status(404).send("Invalid invite code");
        
        const isAlreadyMember = team.members.some(m => m.user && m.user.toString() === req.userId);
        
        if (!isAlreadyMember) {
            team.members.push({ user: req.userId, role: 'member', joinedAt: new Date() });
            await team.save();
        }
        
        res.redirect(`/teams/${team._id}`);
    } catch (error) {
        console.error("Error joining team:", error);
        res.redirect('/teams');
    }
});

// GET - Team dashboard
router.get('/:teamId', requireAuth, async (req, res) => {
    try {
        // Find team and populate users
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId
        }).populate('members.user', 'name email');
        
        if (!team) {
            return res.redirect('/teams');
        }
        
        // Robust check for user role
        const member = team.members.find(m => m.user && m.user._id && m.user._id.toString() === req.userId);
        if (!member) {
            return res.redirect('/teams');
        }
        const userRole = member.role;
        
        // Get notes
        const notes = await SharedNote.find({ team: team._id })
            .sort({ pinned: -1, createdAt: -1 })
            .limit(6)
            .populate('createdBy', 'name');
        
        res.render('team-dashboard', { 
            team: team,
            notes: notes, 
            userRole: userRole, 
            user: req.user 
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.redirect('/teams');
    }
});

// GET - Team notes page (Deprecated, redirect to dashboard)
router.get('/:teamId/notes', requireAuth, (req, res) => {
    res.redirect(`/teams/${req.params.teamId}`);
});

// POST - Create shared note
router.post('/:teamId/notes/add', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId
        });
        
        if (!team) return res.status(404).send("Team not found");
        
        const newNote = await SharedNote.create({
            title,
            content,
            team: req.params.teamId,
            createdBy: req.userId
        });

        const populatedNote = await SharedNote.findById(newNote._id).populate('createdBy', 'name');
        
        // Socket.io real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`team-${req.params.teamId}`).emit('new-shared-note', populatedNote);
        }
        
        res.redirect(`/teams/${req.params.teamId}`);
    } catch (error) {
        console.error("Error creating note:", error);
        res.status(500).send("Error creating note");
    }
});

// POST - Delete shared note
router.post('/:teamId/notes/delete/:noteId', requireAuth, async (req, res) => {
    try {
        // Ensure user is an admin
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId,
            'members.role': 'admin'
        });
        
        if (!team) return res.status(403).send("Unauthorized");
        
        await SharedNote.findByIdAndDelete(req.params.noteId);
        
        // Socket.io real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`team-${req.params.teamId}`).emit('delete-shared-note', req.params.noteId);
        }
        
        res.redirect(`/teams/${req.params.teamId}`);
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).send("Error deleting note");
    }
});

// GET - Team members page
router.get('/:teamId/members', requireAuth, async (req, res) => {
    try {
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId
        }).populate('members.user', 'name email');
        
        if (!team) return res.redirect('/teams');
        
        const member = team.members.find(m => m.user && m.user._id && m.user._id.toString() === req.userId);
        const userRole = member ? member.role : 'member';
        
        res.render('team-members', { team, members: team.members, userRole, user: req.user });
    } catch (error) {
        console.error("Error loading members:", error);
        res.redirect(`/teams/${req.params.teamId}`);
    }
});

// POST - Invite member by email
router.post('/:teamId/members/invite', requireAuth, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find team and verify current user is admin
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId,
            'members.role': 'admin'
        });
        
        if (!team) return res.status(403).send("Unauthorized");
        
        const userToInvite = await User.findOne({ email });
        
        if (userToInvite) {
            // User exists, add directly or check if already a member
            const isAlreadyMember = team.members.some(m => 
                m.user && m.user.toString() === userToInvite._id.toString()
            );
            
            if (!isAlreadyMember) {
                team.members.push({ user: userToInvite._id, role: 'member', joinedAt: new Date() });
                await team.save();

                // Notify user via Socket.io if they are online
                const io = req.app.get('io');
                if (io) {
                    io.to(`user-${userToInvite._id}`).emit('team-added', { teamName: team.name, teamId: team._id });
                }
            }
        } else {
            // User doesn't exist in DB, create a pending invite
            await TeamInvite.create({
                team: team._id,
                email: email,
                invitedBy: req.userId,
                status: 'pending'
            });
        }
        
        res.redirect(`/teams/${req.params.teamId}/members`);
    } catch (error) {
        console.error("Error inviting member:", error);
        res.status(500).send("Error inviting member");
    }
});

// POST - Remove member (admin only)
router.post('/:teamId/members/remove/:memberId', requireAuth, async (req, res) => {
    try {
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId,
            'members.role': 'admin'
        });
        
        if (!team) return res.status(403).send("Unauthorized");
        
        team.members = team.members.filter(m => m.user && m.user.toString() !== req.params.memberId);
        await team.save();
        
        res.redirect(`/teams/${req.params.teamId}/members`);
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).send("Error removing member");
    }
});

// POST - Make member admin (admin only)
router.post('/:teamId/members/make-admin/:memberId', requireAuth, async (req, res) => {
    try {
        const team = await Team.findOne({
            _id: req.params.teamId,
            'members.user': req.userId,
            'members.role': 'admin'
        });
        
        if (!team) return res.status(403).send("Unauthorized");
        
        const member = team.members.find(m => m.user && m.user.toString() === req.params.memberId);
        if (member) {
            member.role = 'admin';
            await team.save();
        }
        
        res.redirect(`/teams/${req.params.teamId}/members`);
    } catch (error) {
        console.error("Error making admin:", error);
        res.status(500).send("Error making admin");
    }
});

// POST - Leave team
router.post('/:teamId/leave', requireAuth, async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if(!team) return res.redirect('/teams');
        
        team.members = team.members.filter(m => m.user && m.user.toString() !== req.userId);
        await team.save();
        
        res.redirect('/teams');
    } catch (error) {
        console.error("Error leaving team:", error);
        res.status(500).send("Error leaving team");
    }
});

// POST - Delete team (creator only)
router.post('/:teamId/delete', requireAuth, async (req, res) => {
    try {
        const team = await Team.findOne({
            _id: req.params.teamId,
            createdBy: req.userId
        });
        
        if (!team) return res.status(403).send("Unauthorized");
        
        await SharedNote.deleteMany({ team: team._id });
        await TeamInvite.deleteMany({ team: team._id });
        await Team.findByIdAndDelete(team._id);
        
        res.redirect('/teams');
    } catch (error) {
        console.error("Error deleting team:", error);
        res.status(500).send("Error deleting team");
    }
});

// POST - Accept team invite
router.post('/invite/accept/:inviteId', requireAuth, async (req, res) => {
    try {
        const invite = await TeamInvite.findById(req.params.inviteId);
        
        if (!invite || invite.email !== req.user.email) {
            return res.status(400).send("Invalid invite");
        }
        
        const team = await Team.findById(invite.team);
        if (!team) return res.status(404).send("Team not found");
        
        const isAlreadyMember = team.members.some(m => m.user && m.user.toString() === req.userId);
        if (!isAlreadyMember) {
            team.members.push({ user: req.userId, role: 'member', joinedAt: new Date() });
            await team.save();
        }
        
        invite.status = 'accepted';
        await invite.save();
        
        res.redirect(`/teams/${team._id}`);
    } catch (error) {
        console.error("Error accepting invite:", error);
        res.status(500).send("Error accepting invite");
    }
});

// POST - Reject team invite
router.post('/invite/reject/:inviteId', requireAuth, async (req, res) => {
    try {
        const invite = await TeamInvite.findById(req.params.inviteId);
        
        if (invite && invite.email === req.user.email) {
            invite.status = 'rejected';
            await invite.save();
        }
        
        res.redirect('/teams');
    } catch (error) {
        console.error("Error rejecting invite:", error);
        res.status(500).send("Error rejecting invite");
    }
});

module.exports = router;