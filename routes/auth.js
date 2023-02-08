const express = require('express');
const router = express.Router();
const passport = require("passport");
const NoteUser= require('../models/NoteUser');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {google, dlp_v2} = require ("googleapis");
const { OAuth2Client } = require('google-auth-library');
const OAuth2 = google.auth.OAuth2;
//OAuth routes
const oAuth2Client= new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN})

//-----------------Google OAUTH USING PASSPORT--------------------------
passport.use(new GoogleStrategy ({

    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/pages",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
    },
        function(accessToken, refreshToken, profile, cb){
            NoteUser.findOrCreate({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
                profileImage:{
                    url: "https://res.cloudinary.com/dbvhtpmx4/image/upload/v1671056080/samples/sheep.jpg",
                    filename:'samples/sheep',
        }   }, 
            function(err, user){
                return cb(err, user);
            })
        }
    ))
//-----------END OF PASSPORT SETUP--------------------------------------------------------------



//route for the google button---
router.get("/google",
    passport.authenticate('google', {scope: ["profile","email"]})
    );
router.get("/google/pages",
    passport.authenticate('google',{ failureFlash:true, failureRedirect: "/login",}),
    (req, res)=>{
        res.redirect('/pages');
    }    
);

//----------------------------------------------------------------------

module.exports=router;