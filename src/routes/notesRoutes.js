const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload');

// ============== HELPER FUNCTION ==============
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ============== WEB ROUTES ==============

// GET all active notes (not archived, not deleted)
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.userId,
            archived: false,
            deleted: false
        }).sort({ pinned: -1, createdAt: -1 });
        
        res.render("index", { 
            notes, 
            user: req.user,
            formatDate 
        });
    } catch (error) {
        console.log(error);
        res.send("Error loading notes");
    }
});

// GET archived notes
router.get('/archived', async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.userId,
            archived: true,
            deleted: false
        }).sort({ createdAt: -1 });
        
        res.render("archived", { 
            notes, 
            user: req.user,
            formatDate 
        });
    } catch (error) {
        console.log(error);
        res.send("Error loading archived notes");
    }
});

// GET recycle bin (deleted notes)
router.get('/recycle-bin', async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.userId,
            deleted: true
        }).sort({ deletedAt: -1 });
        
        res.render("recycle-bin", { 
            notes, 
            user: req.user,
            formatDate 
        });
    } catch (error) {
        console.log(error);
        res.send("Error loading recycle bin");
    }
});

// CREATE note with file backup (fs module) + Cloudinary Attachments
router.post('/add', upload.array('attachments', 5), async (req, res) => {
    try {
        const { title, content } = req.body;
        
        // Handle Cloudinary attachments
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                url: file.path,
                filename: file.originalname,
                public_id: file.filename,
                resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw'
            }));
            console.log(`☁️ Uploaded ${attachments.length} files to Cloudinary`);
        }

        // ========== FILE HANDLING (fs module - legacy backup) ==========
        // Create uploads folder if not exists
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
            console.log("📁 Uploads folder created");
        }
        
        // Create safe filename (remove special characters, add timestamp)
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${Date.now()}_${safeTitle}.txt`;
        const filePath = `${uploadDir}/${fileName}`;
        
        // Save content to file
        fs.writeFileSync(filePath, content);
        console.log(`✅ File backup saved: ${filePath}`);
        
        // ========== MONGODB SAVE ==========
        const note = await Note.create({
            title: title,
            content: content,
            pinned: false,
            archived: false,
            deleted: false,
            user: req.userId,
            filePath: filePath,  // Save file path in database (legacy backup)
            attachments: attachments
        });
        
        console.log(`✅ Note created in MongoDB: ${note._id}`);
        res.redirect("/");
    } catch (error) {
        console.log("Error creating note:", error);
        res.send("Error creating note: " + error.message);
    }
});

// EDIT page
router.get('/edit/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id,
            user: req.userId,
            deleted: false
        });
        
        if (!note) return res.redirect("/");
        res.render("edit", { note, user: req.user });
    } catch (error) {
        res.redirect("/");
    }
});

// UPDATE note (also update file if exists)
router.post('/update/:id', upload.array('attachments', 5), async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id, 
            user: req.userId 
        });
        
        if (!note) return res.redirect("/");
        
        // Handle Cloudinary attachments (Append new ones)
        if (req.files && req.files.length > 0) {
            const newAttachments = req.files.map(file => ({
                url: file.path,
                filename: file.originalname,
                public_id: file.filename,
                resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw'
            }));
            note.attachments = [...note.attachments, ...newAttachments];
        }

        // Update MongoDB
        note.title = req.body.title;
        note.content = req.body.content;
        await note.save();
        
        // Update file if exists
        if (note.filePath && fs.existsSync(note.filePath)) {
            fs.writeFileSync(note.filePath, req.body.content);
            console.log(`✅ File updated: ${note.filePath}`);
        }
        
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error updating note");
    }
});

// SOFT DELETE (Move to recycle bin) - Also delete file
router.post('/delete/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id, 
            user: req.userId 
        });
        
        if (!note) return res.redirect("/");
        
        // Soft delete in MongoDB
        note.deleted = true;
        note.deletedAt = new Date();
        note.archived = false;
        await note.save();
        
        // Optionally: Move file to backup or just keep it
        console.log(`📝 Note moved to recycle bin: ${note._id}`);
        
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error moving to recycle bin");
    }
});

// PERMANENT DELETE (From recycle bin) - Delete file too
router.post('/permanent-delete/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id, 
            user: req.userId,
            deleted: true
        });
        
        if (note && note.filePath && fs.existsSync(note.filePath)) {
            fs.unlinkSync(note.filePath);  // Delete file from system
            console.log(`🗑️ File deleted: ${note.filePath}`);
        }
        
        await Note.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.userId,
            deleted: true
        });
        
        console.log(`💀 Note permanently deleted: ${req.params.id}`);
        res.redirect("/notes/recycle-bin");
    } catch (error) {
        console.log(error);
        res.send("Error permanently deleting note");
    }
});

// RESTORE from recycle bin
router.post('/restore/:id', async (req, res) => {
    try {
        await Note.findOneAndUpdate(
            { _id: req.params.id, user: req.userId, deleted: true },
            { deleted: false, deletedAt: null },
            { new: true }
        );
        console.log(`↩️ Note restored: ${req.params.id}`);
        res.redirect("/notes/recycle-bin");
    } catch (error) {
        console.log(error);
        res.send("Error restoring note");
    }
});

// PIN/UNPIN note
router.post('/:id/pin', async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id, 
            user: req.userId,
            deleted: false
        });
        
        if (!note) return res.redirect("/");
        
        note.pinned = !note.pinned;
        await note.save();
        res.redirect("/");
    } catch (error) {
        res.send("Error toggling pin");
    }
});

// ARCHIVE note
router.post('/:id/archive', async (req, res) => {
    try {
        await Note.findOneAndUpdate(
            { _id: req.params.id, user: req.userId, deleted: false },
            { archived: true },
            { new: true }
        );
        res.redirect("/");
    } catch (error) {
        res.send("Error archiving note");
    }
});

// UNARCHIVE note
router.post('/:id/unarchive', async (req, res) => {
    try {
        await Note.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            { archived: false },
            { new: true }
        );
        res.redirect("/notes/archived");
    } catch (error) {
        res.send("Error unarchiving note");
    }
});

// DOWNLOAD note as file (Bonus feature)
router.get('/download/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ 
            _id: req.params.id, 
            user: req.userId 
        });
        
        if (!note || !note.filePath || !fs.existsSync(note.filePath)) {
            return res.status(404).send("File not found");
        }
        
        res.download(note.filePath, `${note.title}.txt`);
    } catch (error) {
        res.send("Error downloading file");
    }
});

module.exports = router;




