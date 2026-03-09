const express = require('express');
const router = express.Router();

// const {
//     getAllNotes,
//     createNote,
//     deleteNote,
//     updateNote
// } = require('../controllers/notesController');


const {
    getAllNotes,
    createNote,
    deleteNote,
    updateNote,
    togglePin,
    archiveNote,
    unarchiveNote,
    getArchivedNotes
} = require('../controllers/notesController');




router.get('/', getAllNotes);
router.post('/', createNote);
router.put('/:id', updateNote);   
router.delete('/:id', deleteNote);


// router.put('/:id', updateNote);

router.put('/:id/pin', togglePin);          
router.put('/:id/archive', archiveNote);    
router.put('/:id/unarchive', unarchiveNote);

router.get('/archived', getArchivedNotes); 


module.exports = router;