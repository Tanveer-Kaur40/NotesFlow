
const notes = require('../data/notes');

// exports.getAllNotes = (req, res) => {
//     res.json(notes);
// };


exports.getAllNotes = (req, res) => {
    const activeNotes = notes
        .filter(n => !n.archived)
        .sort((a, b) => b.pinned - a.pinned);

    res.json(activeNotes);
};


exports.createNote = (req, res) => {
    const { title, content } = req.body;

    const newNote = {
        id: notes.length + 1,
        title,
        content,
        pinned: false,     // ⭐ default
        archived: false    // ⭐ default
    };

    notes.push(newNote);
    res.status(201).json(newNote);
};





exports.updateNote = (req, res) => {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;

    const note = notes.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ message: "Note not found" });
    }

    note.title = title || note.title;
    note.content = content || note.content;

    res.json(note);
};


exports.deleteNote = (req, res) => {
    const id = parseInt(req.params.id);

    const index = notes.findIndex(note => note.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Note not found" });
    }

    notes.splice(index, 1);
    res.json({ message: "Note deleted" });
};


exports.togglePin = (req, res) => {
    const id = parseInt(req.params.id);

    const note = notes.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ message: "Note not found" });
    }

    note.pinned = !note.pinned;

    res.json(note);
};




exports.archiveNote = (req, res) => {
    const id = parseInt(req.params.id);

    const note = notes.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ message: "Note not found" });
    }

    note.archived = true;

    res.json(note);
};


exports.unarchiveNote = (req, res) => {
    const id = parseInt(req.params.id);

    const note = notes.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ message: "Note not found" });
    }

    note.archived = false;

    res.json(note);
};



exports.getArchivedNotes = (req, res) => {
    const archivedNotes = notes.filter(n => n.archived);
    res.json(archivedNotes);
};

