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
// const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const findOrCreate = require('mongoose-findorcreate');
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
const Review = require("./models/Review");
const NoteUser= require('./models/NoteUser');
const Subscription = require('./models/Subscription');
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


//---------cloudinary configuration-------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "MyNoteBook",
        allowedFormats: ['jpeg', 'png', 'jpg'] 
    } 
    
});

const parser = multer({storage:storage});

//--------------------------------------------------------



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


//--HOME ROUTE----
app.get("/", async(req, res)=>{
    res.render("home");
}); 

//route for the google button---
app.get("/auth/google",
    passport.authenticate('google', {scope: ["profile"]})
    );
app.get("/auth/google/pages",
    passport.authenticate('google',{ failureFlash:true, failureRedirect: "/login",}),
    function(req, res){
        res.redirect('/pages');
    }    
);

//-----------REGISTER----------------------------------------------
app.get("/register", async(req, res)=>{
    res.render("register");
});


app.post("/register", async(req, res, next)=>{
    let date=data.getDay();
    let time= data.getTime();
    const note0 = new Note({
        title: "User "+req.body.username+" created.",
        date:date,
        time:time
    })
    
//-----------------------------------------------------
function codeGenerator(){
    let verificationCode= "";
    for(i=0; i<8; i++){
        verificationCode+=Math.floor((Math.random()*10)+1)
    }
    return verificationCode;
}

const code = codeGenerator();

//------------------------------------------------------------------
//NODEMAILER
async function sendMail(){
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth:{
                type: 'OAuth2',
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
                clientId: process.env.CLIENT_ID, 
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken     
            }
        })

        const mailOptions={
            from: "jereenleblanc.volunteer@rnd4impact.com",
            to: req.body.email,
            subject: "testing email",
            text: "This is the verification code: "+ code
        };

        const result = transporter.sendMail(mailOptions, function(err){
            if(err){
                console.log("Error: " + err);
            }else{
                console.log("Email sucessful");
            }
        })
        return result;
    }catch(error){
        return error;
    }
}


//--------------------------------------------------------------------
    
    //trying to set up error messages.
    const {password, username,email}= req.body; 
    let errorMessage =[];
    // console.log(errorMessage);
    if(password.length < 8){
        req.flash('warning',"Password needs to be 8 or more characters long.");
        res.redirect("/register");
    }else{


        NoteUser.register({
            username:req.body.username,
            email:req.body.email,
            verificationCode: code,
            profileImage:{
                    url: "https://res.cloudinary.com/dbvhtpmx4/image/upload/v1671056080/samples/sheep.jpg",
                    filename:'samples/sheep',
                }   
            },
            req.body.password, function(err,user){
             if(err){
                    // req.flash('warning', err.message)
                    req.flash('warning', 'There was something wrong-username or email');
                    res.redirect('/register');      
            
            }else{    
                // sendMail()
                // .then((result)=> console.log(result))
                // .catch((error)=> console.log(error));
                note0.save();
                passport.authenticate("local")(req, res, function(){
                    NoteUser.findById(req.user.id, async (err, found)=>{
                        if(err){
                            console.log(err)
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/pages");
                            }else{
                               
                                res.redirect("/verification-page");

                            }
                        }
                    })
                })
            }
        })
        }
    
});  






app.get("/login", async(req, res)=>{
    // const errors = req.flash().error || [];
    // res.render("login", {errors});
    res.render('login');
}); 

//login page that takes in the information input by the user and 
//authenticates it before rendering the page
app.post("/login", async(req,res)=>{
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

                   NoteUser.findById(req.user.id, function(err, found){
                        if(err){
                            console.log(err);
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/pages");
                            }else{
                                res.redirect("/verification-page");
                            }
                        }
                    })
                })
    }
   });

});


app.get("/404",function(req,res){
    res.render("404");
});

//-----VERIFICATION OF EMAIL ADDRESS PAGE-----------------
app.get("/verification-page", isLoggedIn, async(req, res)=>{
   

        //finding the user related entries by the id of currently logged in user
        NoteUser.findById(req.user.id, function(err, currentUser){

            if(err){
                console.log(err);
                
                        
            }else{
                if(currentUser){

                    //rendering the verification page
                    res.render("verificationPage", {currentUser:currentUser} );
                 }
              }
           });
     
})

app.post("/verify-email", isLoggedIn, async (req, res)=> {
    
    
    const status = req.body.verificationCode
    const userId =req.user.id
    let verificationMessage=[]

    NoteUser.findById(userId, function(err, currentUser){
        if(err){
            console.log(err);
        }else{
            if(status == currentUser.verificationCode){
                NoteUser.updateOne(
                    {_id:userId},
                    {$set:{"isVerified": true}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            //flash message that shows up at the page redirected to 
                            req.flash('success', 'Account has been verified!');

                            res.redirect("/pages");
                        }
                    }
                )


            }else{

                verificationMessage.push({msg: "Verification code not correct"});
                res.render("verificationPage",{verificationMessage, currentUser:currentUser});
            }
        }
    })
})
//--------------------------------------------------------












//-----SETTINGS PAGE--------------------------------------------------------------------

app.get("/settings",isLoggedIn, async(req, res)=>{
    
        
        // finding the document of the current user for the purpos of getting the url
        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                //finding the user related entries by the id of currently logged in user
                NoteUser.findById(req.user.id, function(err, currentUser){

                    if(err){
                        console.log(err);
                        
                                
                    }else{
                        if(currentUser){
                            //finding the url
                            const pic = findpic.profileImage.url;
                            //rendering the settings page
                            res.render("settings", {pic, currentUser:currentUser} );
                        }
                    }
                });
            }});
  
})
//----PROFILE IMAGE reuest 
//---deals with the profile image upload and only allows one image associated to the user
//to be stored in the cloudinary notebook folder
app.put("/settings/profile-image", isLoggedIn, parser.single("profileImage"), async(req,res)=> {

    const path = req.file.path;
    const filename= req.file.filename;


    //find the currently referenced image and delete it
    NoteUser.findById(req.user.id, function(err, foundUser){
        if(foundUser.profileImage.filename != 'samples/sheep'){
             cloudinary.uploader.destroy(foundUser.profileImage.filename);
        }
       
    })

    NoteUser.updateOne(
        {_id:req.user.id},
        {$set: {"profileImage":{"url":path, "filename": filename }}},
        function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/settings");
                        }
                    }
    )

})

//----------------------------------------------------------------------------------------






//---- TRASH BIN-----------------------------------
app.get("/trash", isLoggedIn,level1Access, async(req,res)=> {

        NoteUser.findById(req.user.id, function(err, findpic) {

            if(err){

                console.log(err);

            }else{
                
                Note.find({"owner": req.user.username, "deleted": "true"}, function(err, foundNoteEntry) {

                    if(err){

                        console.log(err);
                        
                    }else{
                        
                        const pic = findpic.profileImage.url;

                        res.render("trashBin", {pic,foundNoteEntry:foundNoteEntry})
                    }
                })
            }
        });

});

//-----TRASHBIN BUTTONS

//--eraser icon- deletes the entry inside of the notes collection
// and also deletes the associated reviews
app.delete("/trash/delete", isLoggedIn,level1Access, async(req, res)=> {
    const toDelete = req.body.deleteEntry;
    Review.deleteMany({"target":{$eq: toDelete}},function(err){
        if(err){
            console.log(err);
        }
    })

        Note.findByIdAndRemove(toDelete, function(err) {
            if(!err){
                console.log("Entry Deleted Permanently");
                res.redirect("/trash-bin");
            }
        })

})

//--Rench button--the purpose is to undo the deletion on the main user page
app.put("/trash/salvage",isLoggedIn,level1Access, async(req, res)=> {
    const fix = req.body.salvage;
   
         //updating the status of the deleted note to false
        Note.updateOne(
            {_id: fix},
            {$set: {"deleted": "false"}},
                function(err) {
                if(err) {
                    console.log(err);
                }
            }
        )        
        res.redirect("/trash");


})

//----------------------------------------------------------------------


app.get("/checkout",isLoggedIn, async(req,res)=>{
    // finding the document of the current user for the purpos of getting the url
    NoteUser.findById(req.user.id, function(err, findpic){
        if(err){
            console.log(err);
        }else{    
            Subscription.find({}, function(err, subscription){
                if(err){
                    console.log(err);
                }else{
                   
                    const pic = findpic.profileImage.url;
                    res.render("checkout", {pic, subscription: subscription});
                }
                    
            })
        }
    });

})

app.post("/checkout", isLoggedIn,async (req,res)=>{


        try{        
            const id = req.body.subscription_type;
            const data = await Subscription.findById(id);
            // const customer= await stripe.customers.create({description: "new customer"});
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                //array of items that the user wants to purchase
                line_items: [
                    {
                        price_data: {
                            
                            currency:'usd',
                            product_data:{
                                name: data.type,
                            },
                               unit_amount_decimal:data.price *100, 
                            },
                            quantity: 1,
                    },
                ],
                mode: 'payment', 

                success_url: `${process.env.SERVER_URL}/success?id={CHECKOUT_SESSION_ID}`,
                cancel_url:  `${process.env.SERVER_URL}/cancel`,
            })

            res.redirect(303, session.url);
        } catch(e) {
            res.status(500).json({ error: e.message })
        }

    
})

app.get("/cancel", isLoggedIn, async(req,res)=>{
    res.render("cancel");
})
app.get("/success",isLoggedIn, async(req,res)=>{
    theUser = req.user.username;
    const session_id = req.query.id
    
    const session= await stripe.checkout.sessions.listLineItems(req.query.id,{
        expand:['data'],
    });
   
    res.render("success", {theUser:theUser, session:session, session_id:session_id});
})

app.put("/success", isLoggedIn, async(req,res)=>{

    //if session id == to something in the sessions list then only redirect the page
    //else save the session id and the name of the access
    //update status of access to equal the product name/description
    const productname = req.body.Name;
    const session_id= req.body.session_id; 
    const username= req.user.username;
    console.log("sessiong: "+ productname);
    console.log("session: "+ session_id);

    Session.findOne({"sessions":session_id}, function(err, findSession){
        if(!err){
            const newSession = new Session({
                sessions: session_id,
                username: username,
                item: productname, 
            });
            newSession.save();
            NoteUser.updateOne(
                {"username":username},
                {$set:{"accessType":productname}},
                function(err){
                    if(err){

                    }else{
                        setTimeout(()=>
                        {   
                            console.log("session updated");
                            res.redirect("/pages");
                        },5000
                        );
                    }
                }


                    )
                }else{
                    console.log("refresh detected");
                    res.redirect("/pages");

                }
})




})



app.get('/source', async(req, res)=>{
    const source= await stripe.sources.retrive(

    )
})

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



//-----------------Logout------------------------------------------
//log out page using the logout function
app.get("/logout", isLoggedIn, async(req,res, next)=>{
    req.logout(function(err){
        if(err){
            return next(err)
        }
    });
    res.redirect("/");
})

//-------------------------------------------------------------------



//customising the port to be used for local and heroku....
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function(){
    console.log("Server has started successfully");
});