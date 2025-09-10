const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const PORT_NUMBER = 8080;
const studentCourses = require("./routes/studentcourses")
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/student", studentCourses);


// Routers
const authRoutes = require("./routes/auth");

//References to the static assets
app.use(express.static("node_modules/bootstrap/dist/css"));
app.use(express.static("images")); //This one means statics are in images folder. So paths will just be /porsche.jpg for example rather than absolute paths
// app.use(express.static("scripts"));

// Configure EJS
app.engine("html", ejs.renderFile);
app.set("view engine", "html");

// Configure Mongoose
const URL = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fit2101_lms";
async function connectDB(url){
    await mongoose.connect(url);
    return("Connected successfully");
};
connectDB(URL).then(console.log).catch(err => console.log(err))


// Global variable to store the current user
let currentUser = null;
function setCurrentUser(user) {
  currentUser = user;
  global.currentUser = user; // update global variable
}
global.setCurrentUser = setCurrentUser; // Make it globally accessible
// =============================================================================================================
// Middleware to make it available in EJS
app.use((req, res, next) => {
  res.locals.user = currentUser; // <%= user %> in EJS
  next();
});

app.get("/", (req, res) => {
    if (currentUser) {
        return res.render("index"); 
    } else {
        return res.redirect("/auth/login");
    }
});   

app.use("/auth", authRoutes); 

app.listen(PORT_NUMBER, function(){
    console.log("Listening at http://localhost:" + PORT_NUMBER);
} );
