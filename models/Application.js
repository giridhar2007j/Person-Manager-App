const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
    registrationId: String,
    fullName: String,
    fatherName: String,
    dob: Date,
    gender: String,
    category: String,
    mobile: String,
    email: String,
    graduation: String,
    percentage: Number,
    passingYear: Number,
    photo: String,
    signature: String
}, { timestamps: true });

module.exports = mongoose.model("Application", applicationSchema);
