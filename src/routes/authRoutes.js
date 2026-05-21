const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const { redirectIfLoggedIn } = require('../middleware/authMiddleware');

// Show login page (already logged in users ko redirect)
router.get("/login", redirectIfLoggedIn, (req, res) => {
    res.render("login", { error: null });
});

// Show signup page
router.get("/signup", redirectIfLoggedIn, (req, res) => {
    res.render("signup", { error: null });
});

// Signup - Create new account
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log("📝 Signup attempt:", email);
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("signup", { error: "Email already exists! Please login." });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword 
        });
        
        console.log("✅ User created:", user.email);
        
        // Create JWT token
        const token = jwt.sign({ userId: user._id }, "secretkey", { expiresIn: "7d" });
        res.cookie("token", token);
        
        // Redirect to home page (notes)
        res.redirect("/");
        
    } catch (error) {
        console.log("Signup error:", error);
        res.render("signup", { error: "Something went wrong! Try again." });
    }
});

// Login - Sign in to existing account
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("🔐 Login attempt:", email);
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render("login", { error: "User not found! Please signup first." });
        }
        
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("login", { error: "Wrong password! Try again." });
        }
        
        // Create JWT token
        const token = jwt.sign({ userId: user._id }, "secretkey", { expiresIn: "7d" });
        res.cookie("token", token);
        
        console.log("✅ User logged in:", user.email);
        
        // Redirect to home page (notes)
        res.redirect("/");
        
    } catch (error) {
        console.log("Login error:", error);
        res.render("login", { error: "Login failed! Try again." });
    }
});

// Logout - Clear cookie and redirect to login
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    console.log("👋 User logged out");
    res.redirect("/login");
});

module.exports = router;