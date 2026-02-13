const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const Application = require("./models/Application");
const User = require("./models/User");

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
});

// View Engine
app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

// Make User Available in All Views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isLoggedIn = req.session.userId ? true : false;
    next();
});

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect("/login");
};

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage - Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "person-manager-app",
        format: async (req, file) => "jpg",
        public_id: (req, file) => {
            return `${Date.now()}-${file.originalname.split(".")[0]}`;
        }
    }
});

const upload = multer({ storage: storage });

// Generate Registration ID
function generateRegId() {
    return "GOV" + Date.now();
}

// Routes

// Signup Routes
app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        // Validate required fields
        if (!email || !password || !confirmPassword) {
            return res.status(400).send("All fields are required");
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Please enter a valid email address");
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).send("Password must be at least 6 characters long");
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords do not match");
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).send("Email already registered");
        }

        // Create new user
        const newUser = new User({
            email: email,
            password: password
        });

        await newUser.save();
        
        // Store user info in session (auto-login after signup)
        req.session.userId = newUser._id;
        req.session.user = { _id: newUser._id, email: newUser.email };

        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred during signup. Please try again.");
    }
});

// Login Routes
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        // Find user by email
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        // Compare password using bcrypt
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).send("Invalid email or password");
        }

        // Store user info in session
        req.session.userId = user._id;
        req.session.user = { _id: user._id, email: user.email };

        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred during login. Please try again.");
    }
});

app.get("/", async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        
        let query = {};

        if (search) {
            query = { name: { $regex: search, $options: "i" } };
        }

        const result = await Application.paginate(query, { page, limit });
        
        res.render("index", { 
            persons: result.docs, 
            search,
            currentPage: result.page,
            totalPages: result.pages,
            isLoggedIn: req.session.userId ? true : false,
            userEmail: req.session.userEmail || ""
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while fetching persons. Please try again.");
    }
});

app.get("/apply", isAuthenticated, (req, res) => {
    res.render("application");
});

app.post("/apply", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
        // Extract fields
        const name = req.body.name;
        const age = req.body.age;
        const email = req.body.email;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).send("Name and email are required fields");
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Please enter a valid email address");
        }

        const regId = generateRegId();

        const newApplication = new Application({
            registrationId: regId,
            name: name,
            age: age,
            email: email,
            image: req.file ? req.file.path : ""
        });

        await newApplication.save();
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while processing your application. Please try again.");
    }
});

app.get("/admitcard/:id", async (req, res) => {
    const applicant = await Application.findOne({ registrationId: req.params.id });

    if (!applicant) {
        return res.send("Application Not Found");
    }

    res.render("admitcard", { applicant });
});

app.get("/edit/:id", isAuthenticated, async (req, res) => {
    try {
        const id = req.params.id;
        const person = await Application.findById(id);
        
        if (!person) {
            return res.status(404).send("Application not found");
        }
        
        res.render("edit", { person });
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while loading the application. Please try again.");
    }
});

app.post("/edit/:id", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
        const id = req.params.id;
        const name = req.body.name;
        const age = req.body.age;
        const email = req.body.email;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).send("Name and email are required fields");
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Please enter a valid email address");
        }

        // Get existing person to preserve image if not updating
        const existingPerson = await Application.findById(id);
        if (!existingPerson) {
            return res.status(404).send("Application not found");
        }

        const updateData = {
            name: name,
            age: age,
            email: email
        };

        // Only update image if a new one is provided
        if (req.file) {
            updateData.image = req.file.path;
        }

        const updatedPerson = await Application.findByIdAndUpdate(id, updateData, { new: true });
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while updating the application. Please try again.");
    }
});

app.post("/delete/:id", isAuthenticated, async (req, res) => {
    try {
        const id = req.params.id;
        const result = await Application.findByIdAndDelete(id);
        
        if (!result) {
            return res.status(404).send("Application not found");
        }
        
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while deleting the application. Please try again.");
    }
});

// Logout Route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("An error occurred during logout.");
        }
        res.redirect("/");
    });
});

const PORT = process.env.PORT || 3000;

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Error:", err);
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Something went wrong";
    
    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === "production" 
        ? "An error occurred. Please try again later." 
        : message;
    
    res.status(status).send(errorMessage);
});

// 404 Handler - Must be after all routes
app.use((req, res) => {
    res.status(404).send("Page not found");
});

// Uncaught Exception Handler
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

// Unhandled Rejection Handler
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});