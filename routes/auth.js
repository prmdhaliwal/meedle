// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

/** LOGIN SECTION */

// Render login page
router.get("/login", function(req, res) {
  res.render("login"); 
});

// Handle login form submission
router.post("/login", async function(req, res) {
    // const { email, password } = req.body;
    // const user

    // = await User    .findOne({ email, password });
    // if (!user) {
    //     return res.send("Invalid email or password");
    // }
    // save in global variable

    //for now just allow the thing
    global.setCurrentUser("dummy");   

    // redirect to home page
    return res.redirect("/");
});

/** REGISTER SECTION */

// Render register page
router.get("/register", function(req, res) {
  res.render("register"); 
});

// Handle register form submission
router.post("/register", async function(req, res) {
    const { name, email, password } = req.body;
     
    //check the email is not already registered as a pop up modal
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send("Email is already registered. Please use a different email.");
    }

    const newUser = new User({
      name,
      email,  
      password,
      isAdmin: false // for simplicity, all new users are not admins until manually changed in MongoDB
    });

    await newUser.save();
    res.redirect("/auth/login");
});

    // TODO
    // logout route



module.exports = router;


// module.exports = function (setCurrentUser) {
//   const router = express.Router();

//   // show login form
//   router.get("/login", (req, res) => {
//     res.render("login"); 
//   });

//   // handle login
//   router.post("/login", async (req, res) => {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email, password: hashed });
//     if (!user) {
//       return res.send("Invalid email or password");
//     }

//     // save in global variable
//     setCurrentUser(user);

//     // go to dashboard
//     return res.redirect("/dashboard");
//   });

//   // show register form
//   router.get("/register", (req, res) => {
//     res.render("register"); // views/register.ejs
//   });

//   // handle register
//   router.post("/register", async (req, res) => {
//     const { username, email, password, isAdmin } = req.body;

//     const newUser = new User({
//       username,
//       email,
//       password,
//       isAdmin: isAdmin === "true" // from a checkbox/select in your form
//     });

//     await newUser.save();
//     res.redirect("/login");
//   });

//   // logout
//   router.get("/logout", (req, res) => {
//     setCurrentUser(null); // clear global variable
//     res.redirect("/login");
//   });

//   return router;
// };