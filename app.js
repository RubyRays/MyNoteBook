//adding the requirements 
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const mongoose = require("mongoose");
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const methodOverride=require('method-override');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require("lodash");
const https = require("https");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const e = require('express');
const nodemailer = require("nodemailer");
const {google, dlp_v2} = require ("googleapis");
const { OAuth2Client } = require('google-auth-library');
const OAuth2 = google.auth.OAuth2
const stripe= require('stripe')(process.env.STRIPE_PRIVATE_KEY);
//modules---------------
const Note = require('./models/Note');
// const Review = require("./models/Review");
const NoteUser= require('./models/NoteUser');
// const Subscription = require('./models/Subscription');
const Session = require('./models/Session');
//middleware-----------------------------
const {isLoggedIn} = require('./middleware/login_middlewaare');
const {level1Access, level2Access}= require('./middleware/access_middleware');
const { query } = require('express');
const ErrorHandle = ('./ErrorHandle.js');
//-----------------
//--helper functions for ejs
const instaClick = require('./clickBtn.js');
//OAuth routes
const oAuth2Client= new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN})
const app = express();

//Routes
const pages = require('./routes/pages.js');
const public= require('./routes/public-pages');
const checkout= require('./routes/checkout');
const trash=require('./routes/trash');
const settings = require('./routes/settings');
const success = require('./routes/success');
const verify = require('./routes/verify');
const register= require('./routes/register');
const login = require('./routes/login');
const cancel = require('./routes/cancel');
const auth = require('./routes/auth.js');





app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('views', path.join(__dirname, 'views'));
app.use(flash());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');



app.use(session({
    secret: process.env.SECRET,
    resave:false, 
    saveUninitialized: false, 
}));


app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.locals.warning = req.flash('warning');
    // res.locals.warning = req.flash();
    next();
})





// app.use(async (req, res, next)=> {
//     const error = new Error("Not found");
//     error.status = 404;
//     next(error);
// })


// app.use((error, req, res, next)=>{
//     res.status(error.status);
//     res.json({
//         error:{
//             message: error.message
//         }
//     });
// });

//-----------MONGODB CONNECTIONS---------------------------------------------

//--------------FOR MONGODB ATLAS-------------------------------
// const dbUsername= process.env.DBUSERNAME;
// const dbPassword= process.env.DBPASSWORD;
// const cluster =  process.env.CLUSTER;
//--------------------------------------------------------------

mongoose.connect("mongodb://localhost:27017/noteUserDB");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});
//--------------FOR MONGODB ATLAS---------------------------------------
// const dbUrl= "mongodb+srv://"+dbUsername+":"+dbPassword+cluster+"/notesAppDB?retryWrites=true&w=majority"

// mongoose.connect(dbUrl).then(()=>{
//     console.info("Database connected");
// }).catch(err=> {console.log("Error",err);});

//----------------------------------------------------------------------


//-----PASSPORT SETUP----------------------------------------------------------------

passport.use(NoteUser.createStrategy());

passport.serializeUser(function(user, cb){
    process.nextTick(function(){
        return cb(null, {
            id:user.id,
            username: user.username, 
            picture: user.picture
        });
    });
});
passport.deserializeUser(function(user, cb){
    process.nextTick(function(){
        return cb(null, user);
    });
});

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



app.use(function(err, req, res, next) {
    console.log("*************ERROR***************")
    next(err)
})

app.use("/pages", pages);
app.use("/public-pages", public);
app.use("/checkout", checkout);
app.use("/trash", trash);
app.use("/settings",settings);
app.use("/success", success);
app.use("/verify", verify);
app.use("/register", register);
app.use("/login", login);
app.use("/cancel", cancel);
app.use("/auth", auth)

//--HOME ROUTE----
app.get("/", async(req, res)=>{
    res.render("home");
}); 








//Admin product page
app.get("/practice-page", async(req, res)=>{
    const a = 1;
    const b = 2;

    console.info(PerformanceNavigationTiming);
    if (PerformanceNavigationTiming == PerformanceNavigationTiming.TYPE_RELOAD) {
  console.info( "This page is reloaded" );
} else {

  console.info( "This page is not reloaded");
}
    // res.render('practicePage', {a:a, b:b, instaClick});
})

app.post("/practice-page", async(req,res)=>{
    const g = req.body;
    console.log(g);
})







//customising the port to be used for local and heroku....
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function(){
    console.log("Server has started successfully");
});