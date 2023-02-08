const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const passport = require("passport");
const catchAsync = require('../middleware/catchAsync');




router.get("/", async(req, res)=>{
    // const errors = req.flash().error || [];
    // res.render("login", {errors});
    res.render('login');
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
        req.flash('warning', 'There was something wrong-username or email');
        res.redirect('/register');    

    }else{
        passport.authenticate("local", {
            failureFlash: true, 
            failureRedirect: '/login',
                })(req, res, function(){

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