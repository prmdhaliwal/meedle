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
const { ClassLesson } = require("./models/lesson")
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
const submissionRouter = require('./routes/submission_page');

//References to the static assets
app.use(express.static("node_modules/bootstrap/dist/css"));
app.use(express.static("images")); //This one means statics are in images folder. So paths will just be /porsche.jpg for example rather than absolute paths
// app.use(express.static("scripts"));
app.use('/submission', submissionRouter);


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
      .populate({
        path: "classroom",
        populate: [
          { path: "course" },
          { path: "instructor", select: "name email" }
        ]
      })
      .lean();

    const classObjectIds = enrolls
      .map((e) => e.classroom && e.classroom._id)
      .filter(Boolean);

    const classIds = classObjectIds.map((id) => id.toString());

    const lessonsByClass = {};

    if (classObjectIds.length > 0) {
      const links = await ClassLesson.find({ classroom: { $in: classObjectIds } })
        .populate({ path: "lesson", select: "title" })
        .lean();

      links.forEach((link) => {
        if (!link || !link.lesson || !link.lesson._id || !link.classroom) {
          return;
        }
        const key = typeof link.classroom === "string"
          ? link.classroom
          : link.classroom.toString();
        if (!lessonsByClass[key]) {
          lessonsByClass[key] = [];
        }
        lessonsByClass[key].push({
          _id: link.lesson._id.toString(),
          title: link.lesson.title || "Lesson"
        });
      });
    }

    myClasses = enrolls.map((e) => {
      const classroom = e.classroom || {};
      const classId = classroom._id ? classroom._id.toString() : "";
      const lessons = lessonsByClass[classId] || [];
      return {
        classId,
        title: classroom.title || "(Untitled)",
        term: classroom.term || "",
        code: classroom.course && classroom.course.code ? classroom.course.code : "",
        instructorName: classroom.instructor && classroom.instructor.name ? classroom.instructor.name : "TBA",
        instructorEmail: classroom.instructor && classroom.instructor.email ? classroom.instructor.email : "",
        lessons
      };
    });
  } catch (err) {
    console.error("Failed to load enrolled classes", err);
    return res.status(500).send("ERROR");
  }

  return res.render("index", { myClasses });

});   




app.use("/auth", authRoutes); 
app.use("/", lessonRoutes)
app.use("/", assignmentRoutes)

app.listen(PORT_NUMBER, function(){
    console.log("Listening at http://localhost:" + PORT_NUMBER);
} );

