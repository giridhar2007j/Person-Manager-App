const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const Application = require("./models/Application");

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// View Engine
app.set("view engine", "ejs");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "photo") {
            cb(null, "uploads/photos");
        } else {
            cb(null, "uploads/signatures");
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Generate Registration ID
function generateRegId() {
    return "GOV" + Date.now();
}

// Routes

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/apply", (req, res) => {
    res.render("application");
});

app.post("/apply", upload.fields([
    { name: "photo" },
    { name: "signature" }
]), async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.fullName || !req.body.fatherName || !req.body.dob || !req.body.gender || 
            !req.body.category || !req.body.mobile || !req.body.email || !req.body.graduation || 
            !req.body.percentage || !req.body.passingYear) {
            return res.status(400).send("All fields are required");
        }

        // Validate files
        if (!req.files || !req.files.photo || !req.files.signature) {
            return res.status(400).send("Both photo and signature are required");
        }

        // Validate mobile number
        if (!/^[0-9]{10}$/.test(req.body.mobile)) {
            return res.status(400).send("Please enter a valid 10-digit mobile number");
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
            return res.status(400).send("Please enter a valid email address");
        }

        const regId = generateRegId();

        const newApplication = new Application({
            registrationId: regId,
            fullName: req.body.fullName,
            fatherName: req.body.fatherName,
            dob: req.body.dob,
            gender: req.body.gender,
            category: req.body.category,
            mobile: req.body.mobile,
            email: req.body.email,
            graduation: req.body.graduation,
            percentage: req.body.percentage,
            passingYear: req.body.passingYear,
            photo: req.files.photo[0].filename,
            signature: req.files.signature[0].filename
        });

        await newApplication.save();
        res.render("success", { regId: regId });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});