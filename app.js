//jshint esversion:6
//adding the requirements 
require('dotenv').config();
const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
// const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require("mongoose");
const session = require('express-session');
const MongoStore = require('connect-mongo'); 
const flash = require('connect-flash');
const path = require('path');
const methodOverride=require('method-override');
const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const findOrCreate = require('mongoose-findorcreate');
// const _ = require("lodash");
// const https = require("https");
// const multer = require("multer");
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const e = require('express');
// const nodemailer = require("nodemailer");
const {google, dlp_v2, appengine_v1alpha} = require ("googleapis");
const { OAuth2Client } = require('google-auth-library');
const OAuth2 = google.auth.OAuth2;
// const stripe= require('stripe')(process.env.STRIPE_PRIVATE_KEY);
//modules---------------
// const Note = require('./models/Note');
const NoteUser= require('./models/NoteUser');
//middleware-----------------------------
const {isLoggedIn} = require('./middleware/login_middlewaare');
// const {level1Access, level2Access}= require('./middleware/access_middleware');
// const { query } = require('express');
//error middleware
const CustomError = require('./middleware/CustomError');
const catchAsync = require('./middleware/catchAsync');
//-----------------
//--helper functions for ejs
// const instaClick = require('./clickBtn.js');
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
const auth = require('./routes/auth');
const logout = require('./routes/logout');
const search = require('./routes/search-results');


app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('views', path.join(__dirname, 'views'));
app.use(flash());
app.use(methodOverride('_method'));
app.use(expressLayouts);
app.set('view engine', 'ejs');

//-----------MONGODB CONNECTIONS---------------------------------------------

//--------------FOR MONGODB ATLAS-------------------------------
const dbUsername= process.env.DBUSERNAME;
const dbPassword= process.env.DBPASSWORD;
const cluster =  process.env.CLUSTER;
//--------------------------------------------------------------

// mongoose.connect("mongodb://localhost:27017/noteUserDB");
// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "connection error:"));
// db.once("open", () => {
//     console.log("Database connected");
// });
//--------------FOR MONGODB ATLAS---------------------------------------
const dbUrl= "mongodb+srv://"+dbUsername+":"+dbPassword+cluster+"/notesAppDB?retryWrites=true&w=majority"

mongoose.connect(dbUrl).then(()=>{
    console.info("Database connected");
}).catch(err=> {console.log("Error",err);});

//----------------------------------------------------------------------

const store = new MongoStore({
    mongoUrl:  dbUrl,
    collection:"sessions",
    secret: process.env.SECRET,
    //only save after 24hours if no change was made
    touchAfter: 24*60*60
    });
store.on("error", function(e){
    console.log("SESSION STORE ERROR", e);
})


const sessionConfig = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
    }
}

app.use(session(sessionConfig));


// app.use(session({
//     secret: process.env.SECRET,
//     resave:false, 
//     saveUninitialized: true,
//     store: new MongoStore({
//         mongoUrl: dbUrl,
//         ttl: 24*60*60
//     })

// }));



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
app.use("/auth", auth);
app.use("/logout",logout);
app.use("/search-results", search);

//--HOME ROUTE----
app.get("/", async(req, res)=>{
    const theme= "default";
    res.render("home", {theme:theme});
});





app.put("/nav", isLoggedIn, catchAsync(async(req, res)=>{

    const theUser = req.user.id;
    const prevUrl = req.body.prevUrl;
    const noteuser = await NoteUser.findById(theUser);
    if(noteuser.theme == "default"){
        await NoteUser.updateOne({_id: theUser}, {"theme": "dark"});
        
    }else{
         await NoteUser.updateOne({_id: theUser}, {"theme": "default"});
                
    }

    res.redirect("/"+prevUrl)


}))



//for all other routes that had problems
//non exsistant page
app.all('*', (req, res, next)=>{
    next(new CustomError("Page Not Found", 404));
})

app.use((err, req, res, next)=> {
    const {statusCode= 500, message= 'Something went wrong'} = err;
    res.status(statusCode).send(message);
})




//customising the port to be used for local and heroku....
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function(){
    console.log("Server has started successfully");
});