// const express = require('express');

// const app = express();   
// const PORT = 5000;       


// app.get('/', (req, res) => {
//     res.send('NoteFlow Backend Running ');
// });


// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });



const express = require('express');
const app = express();

const notesRoutes = require('./src/routes/notesRoutes');

const PORT = 5000;


app.use(express.json());


app.get('/', (req, res) => {
    res.send('NoteFlow API Running');
});


app.use('/notes', notesRoutes);


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});