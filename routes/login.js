const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const passport = require("passport");
const catchAsync = require('../middleware/catchAsync');



//login get request that renders login page
//sends theme variable data
router.get("/", async(req, res)=>{
    const theme= "default";
    res.render('login', {theme:theme, error: req.flash("error")});
}); 

//login page that takes in the information input by the user and 
//authenticates it before rendering the page
router.post("/", async(req,res)=>{
   const user = new NoteUser({
    username: req.body.username,
    password: req.body.password,
 
   });

   req.login(user, function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local", { 
            failureFlash: true, 
            failureRedirect: '/login',
                })(req, res, function(){
                   //looks for the user infromation inside of the database
                   //if it is verified redirect to the main page
                   //if not verified redirect to verification page
                   NoteUser.findById(req.user.id, function(err, found){
                        if(err){
                            console.log(err);
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/pages");
                            }else{
                                res.redirect("/verify");
                            }
                        }
                    })
                })
    }
   });

});

module.exports= router;