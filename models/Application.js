const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const applicationSchema = new mongoose.Schema({
    registrationId: String,
    name: String,
    age: Number,
    email: String,
    image: String,
    fullName: String,
    fatherName: String,
    dob: Date,
    gender: String,
    category: String,
    mobile: String,
    graduation: String,
    percentage: Number,
    passingYear: Number,
    photo: String,
    signature: String
}, { timestamps: true });

applicationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Application", applicationSchema);
