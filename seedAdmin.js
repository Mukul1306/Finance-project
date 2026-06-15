const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const Admin = require("./models/Admin");

mongoose.connect(process.env.MONGO_URI);

async function seed() {

    const password =
    await bcrypt.hash("123456", 10);

    await Admin.create({
        name: "Manager",
        email: "admin@gmail.com",
        password
    });

    console.log("Admin Created");

    process.exit();
}

seed();