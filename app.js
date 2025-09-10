const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const PORT_NUMBER = 8080;
app.use(express.urlencoded({ extended: true }));

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
const URL = "mongodb://127.0.0.1:27017/fit2101_lms";
async function connectDB(url){
    await mongoose.connect(url);
    return("Connected successfully");
};
connectDB(URL).then(console.log).catch(err => console.log(err))


// Global variable to store the current user
let currentUser = null;
function setCurrentUser(user) {
  currentUser = user;
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



/**
 * Can be added to an app.use in a route to require they log in first */
function requireLogin(req, res, next) {
  if (!currentUser) {
    return res.redirect('/login'); // Adjust '/login' to your actual login route
  }
  next();
}
// Example of protecting a route
// app.use('/protected-route', requireLogin, (req, res) => {
//   // ...existing code for protected route...
// });

// app.use("/", authRoutes);





app.listen(PORT_NUMBER, function(){
    console.log("Listening at http://localhost:" + PORT_NUMBER);
} );
