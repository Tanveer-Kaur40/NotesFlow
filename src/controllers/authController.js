const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================
// LOGIN CONTROLLER
// ======================
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. User check karo
        const user = await User.findOne({ email });

        if (!user) {
            return res.send("User not found");
        }

        // 2. Password check (simple version)
        // ⚠️ agar bcrypt use kar raha hai to neeche bataya hai
        if (user.password !== password) {
            return res.send("Invalid password");
        }

        // 3. JWT token create
        const token = jwt.sign(
            { userId: user._id },
            "secretkey",
            { expiresIn: "1h" }
        );

        // 4. Cookie me save
        res.cookie("token", token);

        // 5. Redirect
        res.redirect("/notes");

    } catch (err) {
        console.log(err);
        res.send("Server Error");
    }
};


// ======================
// REGISTER CONTROLLER (optional but useful)
// ======================
exports.registerUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.send("User already exists");
        }

        const newUser = new User({
            email,
            password
        });

        await newUser.save();

        res.redirect("/login");

    } catch (err) {
        console.log(err);
        res.send("Error in registration");
    }
};



const prisma = require('../config/prisma')

const users = await prisma.user.findMany()

