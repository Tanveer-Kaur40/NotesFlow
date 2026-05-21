const express = require('express');
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const http = require('http');
const socketIo = require('socket.io');

const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

require("dotenv").config();


// DB connect
const connectDB = require('./src/Config/db');
connectDB();

// Models
const User = require('./src/models/User');
const Note = require('./src/models/Note');

// Packages
const bcrypt = require("bcrypt");

// Routes & Middleware
const notesRoutes = require('./src/routes/notesRoutes');
const authRoutes = require('./src/routes/authRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
const { requireAuth } = require('./src/middleware/authMiddleware');

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(morgan('dev'));   // Logging
app.use(helmet({ contentSecurityPolicy: false }));  // Security headers
app.use(cors());

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));


// ==================== MAKE USER AVAILABLE TO ALL TEMPLATES ====================
app.use(async (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, "secretkey");
            req.userId = decoded.userId;
            
            req.user = await User.findById(req.userId).select('-password');
            
            if (req.user) {
                console.log("✅ User found:", req.user.email);
            }
        } catch (error) {
            console.log("❌ Token error:", error.message);
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
});

// Format date helper function
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

// ==================== API ROUTES ====================
app.get('/api/notes', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, archived: false, deleted: false }).sort({ pinned: -1 });
        res.json({ success: true, count: notes.length, notes });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/notes/:id', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, user: req.userId });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.post('/api/notes', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const note = await Note.create({ title, content, user: req.userId });
        res.json({ success: true, message: "Note created successfully", note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.put('/api/notes/:id', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId, deleted: false }, { title, content }, { new: true });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, message: "Note updated successfully", note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.patch('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "User updated successfully",
            user
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/notes/:id', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { deleted: true, deletedAt: new Date(), archived: false }, { new: true });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, message: "Note moved to recycle bin" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.patch('/api/notes/:id/pin', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, user: req.userId, deleted: false });
        if (!note) return res.json({ success: false, message: "Note not found" });
        note.pinned = !note.pinned;
        await note.save();
        res.json({ success: true, message: note.pinned ? "Note pinned" : "Note unpinned", pinned: note.pinned });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.patch('/api/notes/:id/archive', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId, deleted: false }, { archived: true }, { new: true });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, message: "Note archived", note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.patch('/api/notes/:id/unarchive', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { archived: false }, { new: true });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, message: "Note unarchived", note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.get('/api/notes/archived/all', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, archived: true, deleted: false });
        res.json({ success: true, count: notes.length, notes });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.get('/api/notes/recycle-bin/all', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, deleted: true }).sort({ deletedAt: -1 });
        res.json({ success: true, count: notes.length, notes });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.patch('/api/notes/:id/restore', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.userId, deleted: true }, { deleted: false, deletedAt: null }, { new: true });
        if (!note) return res.json({ success: false, message: "Note not found in recycle bin" });
        res.json({ success: true, message: "Note restored successfully", note });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.delete('/api/notes/:id/permanent', requireAuth, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId, deleted: true });
        if (!note) return res.json({ success: false, message: "Note not found" });
        res.json({ success: true, message: "Note permanently deleted" });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "User already exists!" });
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        const token = jwt.sign({ userId: user._id }, "secretkey", { expiresIn: "7d" });
        res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email }, token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Wrong password!" });
        const token = jwt.sign({ userId: user._id }, "secretkey", { expiresIn: "7d" });
        res.json({ success: true, data: { id: user._id, name: user.name, email: user.email }, token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Login failed!" });
    }
});


// ==================== WEB ROUTES ====================
app.use('/', authRoutes);
app.use('/teams', requireAuth, teamRoutes);

app.get('/', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, archived: false, deleted: false }).sort({ pinned: -1, createdAt: -1 });
        res.render("index", { notes, user: req.user, formatDate });
    } catch (error) {
        res.send("Error loading notes");
    }
});
app.get('/archived', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, archived: true, deleted: false }).sort({ createdAt: -1 });
        res.render("archived", { notes, user: req.user, formatDate });
    } catch (error) {
        res.send("Error loading archived notes");
    }
});
app.get('/recycle-bin', requireAuth, async (req, res) => {
    try {
        const notes = await Note.find({ user: req.userId, deleted: true }).sort({ deletedAt: -1 });
        res.render("recycle-bin", { notes, user: req.user, formatDate });
    } catch (error) {
        res.send("Error loading recycle bin");
    }
});
app.use('/notes', requireAuth, notesRoutes);


// 404 Page Not Found (Must be before error handler)
app.use((req, res) => {
    res.status(404).render("error", { 
        message: "Page not found! The page you are looking for does not exist."
    });
});

// Error handling middleware (Last)
app.use((err, req, res, next) => {
    console.error("❌ Error:", err.message);
    res.status(500).render("error", { 
        message: err.message || "Something went wrong!"
    });
});


// ==================== SOCKET.IO (Real-time Team Collaboration) ====================
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    }
});

// Pass io to app so routes can use it
app.set('io', io);

// Socket.io authentication middleware
io.use((socket, next) => {
    // You can also authenticate via cookies if needed, or rely on client passing a token.
    // For simplicity, we just log connections without strict socket-level JWT blocking if not needed, 
    // but here we support query tokens or handshake auth:
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, "secretkey");
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    } else {
        // Allow anonymous connection for basic real-time updates if they have a session cookie handled by browser
        // For secure socket rooms, we verify userId
        const cookie = socket.request.headers.cookie;
        if(cookie && cookie.includes('token=')) {
            try {
                const tokenStr = cookie.split('token=')[1].split(';')[0];
                const decoded = jwt.verify(tokenStr, "secretkey");
                socket.userId = decoded.userId;
                next();
            } catch(e) {
                next(new Error('Auth error'));
            }
        } else {
            next(new Error('Authentication error'));
        }
    }
});

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.userId);
    
    // Join personal user room to receive targeted notifications
    if (socket.userId) {
        socket.join(`user-${socket.userId}`);
    }

    // Join team room
    socket.on('join-team', (teamId) => {
        socket.join(`team-${teamId}`);
        console.log(`User ${socket.userId} joined team ${teamId}`);
    });
    
    // Leave team room
    socket.on('leave-team', (teamId) => {
        socket.leave(`team-${teamId}`);
        console.log(`User ${socket.userId} left team ${teamId}`);
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
        socket.to(`team-${data.teamId}`).emit('user-typing', {
            userId: socket.userId,
            userName: data.userName
        });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.userId);
    });
});


// ==================== SERVER ====================
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready for real-time collaboration`);
});

module.exports = app;

// const express = require('express');
// const app = express();
// const path = require("path");
// const cookieParser = require("cookie-parser");
// const jwt = require("jsonwebtoken");
// const http = require('http');
// const socketIo = require('socket.io');

// const morgan = require('morgan');
// const helmet = require('helmet');
// const cors = require('cors');

// require("dotenv").config();

// // DB connect
// const connectDB = require('./src/Config/db');
// connectDB();

// // Models
// const User = require('./src/models/User');
// const Note = require('./src/models/Note');

// // Packages
// const bcrypt = require("bcrypt");

// // Routes & Middleware
// const notesRoutes = require('./src/routes/notesRoutes');
// const authRoutes = require('./src/routes/authRoutes');
// const teamRoutes = require('./src/routes/teamRoutes');
// const { requireAuth } = require('./src/middleware/authMiddleware');

// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static("public"));
// app.use(cookieParser());

// // 🔴 YEH LINE ADD KI HAI (Static uploads folder route)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use(morgan('dev'));   // Logging
// app.use(helmet({ contentSecurityPolicy: false }));  // Security headers
// app.use(cors());

// // EJS setup
// // EJS setup
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "src/views"));


// // ==================== MAKE USER AVAILABLE TO ALL TEMPLATES ====================\
// app.use(async (req, res, next) => {
//     const token = req.cookies.token;
//     if (token) {
//         try {
//             const decoded = jwt.verify(token, "secretkey");
//             const user = await User.findById(decoded.userId).select("-password");
//             res.locals.user = user;
//             req.user = user;
//             req.userId = decoded.userId;
//         } catch (err) {
//             res.locals.user = null;
//         }
//     } else {
//         res.locals.user = null;
//     }
//     next();
// });

// // Routes Links
// app.get('/', (req, res) => {
//     if (req.cookies.token) {
//         res.redirect('/notes');
//     } else {
//         res.render('login', { error: null });
//     }
// });

// app.use('/auth', authRoutes);
// app.use('/notes', requireAuth, notesRoutes);

// // Socket server setup
// const server = http.createServer(app);
// const io = socketIo(server);

// io.use((socket, next) => {
//     if (socket.handshake.headers.cookie) {
//         const rawCookies = socket.handshake.headers.cookie;
//         if(rawCookies.includes('token=')){
//             try {
//                 const tokenStr = rawCookies.split('token=')[1].split(';')[0];
//                 const decoded = jwt.verify(tokenStr, "secretkey");
//                 socket.userId = decoded.userId;
//                 next();
//             } catch(e) {
//                 next(new Error('Auth error'));
//             }
//         } else {
//             next(new Error('Authentication error'));
//         }
//     }
// });

// io.on('connection', (socket) => {
//     console.log('🔌 Socket connected:', socket.userId);
    
//     if (socket.userId) {
//         socket.join(`user-${socket.userId}`);
//     }

//     socket.on('join-team', (teamId) => {
//         socket.join(`team-${teamId}`);
//         console.log(`User ${socket.userId} joined team ${teamId}`);
//     });
    
//     socket.on('leave-team', (teamId) => {
//         socket.leave(`team-${teamId}`);
//         console.log(`User ${socket.userId} left team ${teamId}`);
//     });
    
//     socket.on('typing', (data) => {
//         socket.to(`team-${data.teamId}`).emit('user-typing', {
//             userId: socket.userId,
//             userName: data.userName
//         });
//     });
    
//     socket.on('disconnect', () => {
//         console.log('🔌 Socket disconnected:', socket.userId);
//     });
// });

// // ==================== SERVER ====================\
// server.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });