const jwt = require("jsonwebtoken");

// Protected routes ke liye - User logged in hona chahiye

const requireAuth = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.redirect("/login");
    }
    
    try {
        const decoded = jwt.verify(token, "secretkey");
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.redirect("/login");
    }
};

// Already logged in users ke liye - Login/signup page na dikhaye
const redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            jwt.verify(token, "secretkey");
            return res.redirect("/");
        } catch (error) {
            next();
        }
    }
    next();
};

module.exports = { requireAuth, redirectIfLoggedIn };