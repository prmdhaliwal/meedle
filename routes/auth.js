// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ========================================================================================================================================
/** LOGIN SECTION */

// Render login page
router.get("/login", function(req, res) {
  res.render("login"); 
});

// Handle login form submission
router.post("/login", async function(req, res) {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) {
       return res.render('login', { error: 'Invalid email or password' });
    } 
    global.setCurrentUser(user); // set the global variable

    // redirect to home page
    return res.redirect("/");
});
// ========================================================================================================================================
/** REGISTER SECTION */

// Render register page
router.get("/register", function(req, res) {
  res.render("register"); 
});

// Handle register form submission
router.post("/register", async function(req, res) {
    const { name, email, password, gender} = req.body;
     
    //check the email is not already registered as a pop up modal
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.render('register', { error: 'Email is already registered. Please use a different email.' });
    }
 
    const newUser = new User({
      name,
      email,  
      password,
      isAdmin: false, // for simplicity, all new users are not admins until manually changed in MongoDB
      gender
    });

    await newUser.save();
    res.redirect("/auth/login");
});

// ========================================================================================================================================
// Instructor setting password 

router.get("/instructor-set-password", function(req, res) {
  res.render("set-password");
});

router.post("/set-password", async function(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // If the instructor email exists
  if (user) {
    // If the instructor hasn't set a password yet: set password
    if (!user.password) {
      user.password = password;
      user.isAdmin = true; // should already be set but can't hurt to be sure
      await user.save();
      return res.render("login", {error: 'Instructor password set successfully! You can now log in.', positive: true});

    // Else: If the instructor already has a password
    } else {
      return res.render('set-password', { error: 'Password already set' });
    }
  }
  res.render("login", {error: 'No instructor email exists'});  
});

// // ========================================================================================================================================  
// Edit/ change details

router.get("/edit-details", function(req, res) {
  if (!global.currentUser) {
    console.log("User not logged in");
    
    return res.redirect("/auth/login");
  }

  res.render("edit-details", { user: global.currentUser });
});

router.post("/edit-details", async function(req, res) {
  if (!global.currentUser) {
    return res.redirect("/auth/login");
  }

  const { name, email, password, gender } = req.body;
  const user = await User.findById(global.currentUser._id);

  if (!user) {
    return res.redirect("/auth/login");
  }

  user.name = name;
  user.email = email;
  user.password = password;
  user.gender = gender;

  await user.save();
  res.render("edit-details", {error : "Details updated successfully!"});
});

//  TODO
    // logout route
module.exports = router;


