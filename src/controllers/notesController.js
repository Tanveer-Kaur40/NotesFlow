const Note = require('../models/Note');
const User = require('../models/User');

// GET ALL (non-archived notes for logged-in user)
exports.getAllNotes = async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.userId,
            archived: false 
        }).sort({ pinned: -1 });
        
        res.render("index", { notes });
    } catch (error) {
        console.log(error);
        res.send("Error loading notes");
    }
};

// CREATE note with logged-in user
exports.createNote = async (req, res) => {
    try {
        const { title, content } = req.body;
        
        await Note.create({
            title,
            content,
            pinned: false,
            archived: false,
            user: req.userId  // 👈 Logged-in user ki ID
        });
        
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error creating note");
    }
};

// UPDATE note
exports.updateNote = async (req, res) => {
    try {
        await Note.findByIdAndUpdate(req.params.id, req.body);
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error updating note");
    }
};

// DELETE note
exports.deleteNote = async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error deleting note");
    }
};

// PIN / UNPIN note
exports.togglePin = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        note.pinned = !note.pinned;
        await note.save();
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error toggling pin");
    }
};

// ARCHIVE note
exports.archiveNote = async (req, res) => {
    try {
        await Note.findByIdAndUpdate(req.params.id, { archived: true });
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error archiving note");
    }
};

// UNARCHIVE note
exports.unarchiveNote = async (req, res) => {
    try {
        await Note.findByIdAndUpdate(req.params.id, { archived: false });
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Error unarchiving note");
    }
};

// GET ARCHIVED NOTES
exports.getArchivedNotes = async (req, res) => {
    try {
        const notes = await Note.find({ 
            user: req.userId,
            archived: true 
        });
        res.render("index", { notes });
    } catch (error) {
        console.log(error);
        res.send("Error loading archived notes");
    }
};


