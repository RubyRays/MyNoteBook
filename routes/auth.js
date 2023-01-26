const express = require('express');
const router = express.Router();
const passport = require("passport");


//route for the google button---
router.get("/google",
    passport.authenticate('google', {scope: ["profile"]})
    );
router.get("/google/pages",
    passport.authenticate('google',{ failureFlash:true, failureRedirect: "/login",}),
    function(req, res){
        res.redirect('/pages');
    }    
);

//----------------------------------------------------------------------

module.exports=router;