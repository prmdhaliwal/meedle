const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const PORT_NUMBER = 8080;
const studentCourses = require("./routes/studentcourses")
const studentClasses = require("./routes/studentclasses.js")
const instructorClasses = require("./routes/instructorclasses.js")
const lessonClasses = require("./routes/lessonclasses.js")
const { ClassEnrollment } = require("./models/class")
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/student", studentCourses);
app.use("/student", studentClasses);
app.use("/instructor/classes", lessonClasses);
app.use("/instructor", instructorClasses);


// Routers
const authRoutes = require("./routes/auth");
const lessonRoutes = require("./routes/lessons");
const assignmentRoutes = require("./routes/instructor_assignments");

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

app.get("/", async (req, res) => {
    if (!currentUser) return res.redirect("/auth/login");
   
    const me = currentUser;

    let myClasses = [];
  try {
    const enrolls = await ClassEnrollment.find({ student: me._id })
      .populate({ path: "classroom", populate: { path: "course" } })
      .lean();

    myClasses = enrolls.map(e => ({
      title: e.classroom?.title || "(Untitled)",
      term:  e.classroom?.term  || "",
      code:  e.classroom?.course?.code || ""
    }));
  } catch (err) {
    console.error("[/] load classes error:", err.message);
  }

  return res.render("index", { myClasses});

});   

app.use("/auth", authRoutes); 
app.use("/", lessonRoutes)
app.use("/", assignmentRoutes)

app.listen(PORT_NUMBER, function(){
    console.log("Listening at http://localhost:" + PORT_NUMBER);
} );
