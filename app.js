//jshint esversion:6
//adding the requirements 
require('dotenv').config();
const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
const expressLayouts = require('express-ejs-layouts');
const mongoose = require("mongoose");
const session = require('express-session');
const MongoStore = require('connect-mongo'); 
const flash = require('connect-flash');
const path = require('path');
const methodOverride=require('method-override');
const passport = require("passport");
const {google, dlp_v2, appengine_v1alpha} = require ("googleapis");
const { OAuth2Client } = require('google-auth-library');
const OAuth2 = google.auth.OAuth2;
//modules---------------
const NoteUser= require('./models/NoteUser');
//middleware-----------------------------
const {isLoggedIn} = require('./middleware/login_middlewaare');
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

//-----code for local database use
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

//this uses mongo-connect to store the session information
const store = new MongoStore({
    mongoUrl:  dbUrl,
    collection:"sessions",
    secret: process.env.SECRET,
    //only save after 24hours if no change was made
    touchAfter: 24*60*60
    });

//outputs a message if there is an error with the stored session
store.on("error", function(e){
    console.log("SESSION STORE ERROR", e);
})

//this containes the session information or initial cookies 
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



app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.locals.warning = req.flash('warning');
    // res.locals.warning = req.flash();
    next();
})





//-----PASSPORT SETUP----------------------------------------------------------------
//using passport local mongoose
//this creates a local mongoose strategy
passport.use(NoteUser.createStrategy());

//these serialize and deserialize the user
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




//routes for js pages 
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




//update theme for darkmode from navbar
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



//for all routes
//throws a page not found error if a page is non exsistent
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

//port listener
app.listen(port, function(){
    console.log("Server has started successfully");
});