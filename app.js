//adding the requirements 
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const mongoose = require("mongoose");
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const findOrCreate = require('mongoose-findorcreate');
const _ = require("lodash");
const data = require(__dirname+"/data.js");
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
//modules and middleware---------------
const Note = require('./models/Note');
const Review = require("./models/Review");
const NoteUser= require('./models/NoteUser');
const {isLoggedIn} = require('./login_middlewaare');
const Subscription = require('./models/Subscription');
const ErrorHandle = ('./ErrorHandle.js');
//-----------------
const oAuth2Client= new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN})

const app = express();

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
app.set('view engine', 'ejs');



app.use(session({
    secret: process.env.SECRET,
    resave:false, 
    saveUninitialized: false, 
}));


app.use(passport.initialize());
app.use(passport.session());

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
    callbackURL: "http://localhost:3000/auth/google/page",
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



//--HOME ROUTE----
app.get("/", function(req, res){
    res.render("home");
}); 

//route for the google button---
app.get("/auth/google",
    passport.authenticate('google', {scope: ["profile"]})
    );
app.get("/auth/google/page",
    passport.authenticate('google',{failureRedirect: "/login"}),
    function(req, res){
        res.redirect('/page');
    }    
);

//-----------REGISTER----------------------------------------------
app.get("/register", function(req, res){
    res.render("register");
});


app.post("/register", function(req, res, next){
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

  
    
    const user= NoteUser.findOne(username, function(err){
        try{
            if(!err){
                
                errorMessage.push({msg:"Email already used"});
            }
        }catch{
            console.log("error caught")

        }

    })
    if(password.length < 8){
        errorMessage.push({msg:"Password needs to be 8 or more characters long."});
        
    }
    if(errorMessage > 0){
        console.log(errorMessage);
        res.render('register', {errorMessage, email, password});
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
                try{
                    next(err);
                }
                catch{(err)
                    client.query("ROLLBACK")
                    return next(new CustomHandleError(400, 'something '))
                }
                res.redirect("/register");//if there are errors redirect to home
            
            }else{    
                // sendMail()
                // .then((result)=> console.log(result))
                // .catch((error)=> console.log(error));
                note0.save();
                
                passport.authenticate("local")(req, res, function(){
                    NoteUser.findById(req.user.id, function(err, found){
                        if(err){
                            console.log(err)
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/page");
                            }else{
                               
                                res.redirect("/verificationPage");

                            }
                        }
                    })
                })
            }
        })
    
    }
});  






app.get("/login", function(req, res){
    // const errors = req.flash().error || [];
    // res.render("login", {errors});
    res.render('login');
}); 

//login page that takes in the information input by the user and 
//authenticates it before rendering the page
app.post("/login", function(req,res){
   const user = new NoteUser({
    username: req.body.username,
    // email:req.body.email,
    password: req.body.password,
 
   });

   req.login(user, function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local", {
            failureFlash: true, 
            //redirects to login page if value is bad
            failureRedirect: '/login',
                })(req, res, function(){

                   NoteUser.findById(req.user.id, function(err, found){
                        if(err){
                            console.log(err)
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/page");
                            }else{
                                res.redirect("/verificationPage");
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
app.get("/verificationPage", isLoggedIn, function(req, res){
   

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

app.post("/verifyEmail", isLoggedIn, function(req, res) {
    
    
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

                            res.redirect("/page");
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




//-------------------MAIN PAGE FOR USER NOTES--------------------
app.get("/page", isLoggedIn, function(req,res){


        const theUser = req.user.username;


        //finds the current user using the user.id provided by the passport package
        NoteUser.findById(req.user.id,function(err, foundUser) {
            if(err){
                console.log(err);
            }else{

                if(foundUser){

                    //looking for the data in the notes collection where the owner name
                    //is the same as the username of the currently logged in user
                    Note.find({"owner": req.user.username, "deleted":{$ne:"true"}}, function(err, user2) {

                        const pic= foundUser.profileImage.url;
                                            
                        //saves the notes associated with the user into the notebooks array
                        foundUser.noteBookContents=user2;

                        //saves the userinfo into noteUser collection and renders the page
                        foundUser.save(function(){

                            res.render("page", {pic, messages: req.flash('success'), userContent: foundUser, theUser: theUser});
                                
                        })
                    })
                }
            }
        });
  

});

//renders the notebook user page
app.post("/page",isLoggedIn, function(req,res){
    
//API SECTION WHERE DATA IS PASSED FROM ONE API TO BE USED IN THE OTHER BY MEANS OF 
//CALLBACK FUNCTIONS  
    //USING AN IP ADDRESS FINDER TO GET THE CITY NAME OF THE USER
    token=process.env.IPINFO_TOKEN;
    const ipinfoApi ="https://ipinfo.io?token="+token;

    function makeCall (ipinfoApi, callback){

        https.get(ipinfoApi, function(response){

            // console.log(response.statusCode);
            response.on("data", function(data){

                const ipData= JSON.parse(data);
                const city = ipData.city;
                callback(city);
                
            })
        })
}
    function handleResults(results){
        const query= results;
        const apiKey = process.env.WEATHER_API_KEY;
        const unit= "metric"
        //api url for the weather api
        const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q="+query+"&appid="+apiKey+"&units="+unit;

        function makeCall2(weatherUrl, callback){

            https.get(weatherUrl, function(response){
                response.on("data", function(data){
                    //converts data to json
                    const weatherData = JSON.parse(data);
                    const icon = weatherData.weather[0].icon;
                    const imageURL = "http://openweathermap.org/img/wn/"+icon+"@2x.png";
                    callback(imageURL);
                })
            })
        }

        //THE RESULTS OF "makeCall2"
        //SENDS THE WEATHER INFO USING "results2"
        function handleResults2(results2){
            let date=data.getDay();
            let time= data.getTime();
            if(req.body != null){
                //creates a new post
                const post=new Note({
                    title: req.body.title,
                    content: req.body.content,
                    owner: req.user.username,
                    state: "normal-mode",
                    date: date,
                    time: time,
                    imageURL: results2,
                    shared: "false",


                });
            
                //saving the information entered into the note document 
                post.save();
            }

            res.redirect("/page");

        }
        makeCall2(weatherUrl, function(results2) {
            handleResults2(results2);
        })
        }
    makeCall(ipinfoApi, function(results) {
        
        handleResults(results);
    })

     


 }

);


//--------User page Buttons

//--eraser icon request--deletes the entry from the noteuser collection
//and marks it as deleted inside of the notes collection
app.post("/delete",isLoggedIn, function(req, res){
    //distinguishing things to delete
    const clickedEntry = req.body.deleteEntry;

        Note.updateOne(
            {_id: clickedEntry},
            {$set: {"deleted": "true"}},
            function(err) {
                if(err) {
                    console.log(err);
                }
            }
            )
        //Finds the entry with the id of the currently logged in user
        //looks at the notebookContents array and finds the id inside that 
        //corresponds to the clickedEntry (the delete button that corresponds to the entry)
        //then it excludes it from the list after the update
        //this causes the items to be erased from the NoteUser collection.
        NoteUser.findOneAndUpdate({_id:req.user.id},
            {$pull:{noteBookContents:{_id: clickedEntry}}},
            {new:true, useFindAndModify: false},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    res.redirect("/page");
                    
                }
            }
            );

})

//--pen icon request-used to hide and unhide the edit form
app.post("/preEdit",isLoggedIn, function(req, res){

    //gets information sent by the editEntry/pen button
    const editState = req.body.editEntry;
    console.log(editState);
    //find the state of the entry being clicked and toggle it between edit-mode and normal-mode
    Note.findById(editState, function(err, foundEntry){
        if(err){
            console.log(err);
        }else{
            if(foundEntry.state == "edit-mode"){
                Note.updateOne(
                    {_id: editState},
                    {$set: {"state": "normal-mode"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                           
                            res.redirect("/page");
                        }
                    }        
                )                
            }else{
                Note.updateOne(
                    {_id: editState},
                    {$set: {"state": "edit-mode"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            
                            res.redirect("/page");
                        }
                    }        
                )                
            }
        }
    })

})

 
//--edit button request- used to edit user entries
app.post("/edit",isLoggedIn, function(req,res) {
    const toEdit = req.body.Edit;
    const title= req.body.title2;
    const content=req.body.content2;

        //updates the title and content of the note
        Note.updateOne(
            {_id: toEdit},
            {$set: {"title":title, "content":content }},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("edit page button pressed");
                   
                }
            }
        );
        //updates the title and content of the noteUser
        NoteUser.updateOne(
        {_id: req.user.id, "noteBookContents":{"$elemMatch": {"_id": toEdit}}},
        {$set: {"noteBookContents.$.title":title, "noteBookContents.$.content":content }},
        function(err){
            if(err){
                console.log(err);
            }else{
                console.log("edit page button pressed");
                
            }
         }
    );
         //updates the state everytime the edit page button is clicked on
        Note.updateOne(
            {_id: toEdit},
            {$set: {"state": "normal-mode"}},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("edit page button pressed");
                    res.redirect("/page");
                }
            }        
        )
   

})

//--last icon (arrow in a box) request to share and unshare user entries
app.post("/share&unshare",isLoggedIn, function(req, res) {
    const toShare= req.body.share;
    //finding the entry by its id
    Note.findById(toShare, function(err, foundNoteEntry) {
        if(err){
            console.log(err);
        }else{
            //checking the shared state
            //if the state is false when clicked change it to true
            //otherwise change it to false
            if(foundNoteEntry.shared === "false") {
                Note.updateOne(
                    {_id: toShare},
                    {$set: {"shared": "true"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }
                    }
            )
                NoteUser.updateOne(
                    {_id: req.user.id, "noteBookContents": {"$elemMatch":{"_id": toShare}}},
                    {$set: {"noteBookContents.$.shared": "true"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/page");
                        }
                    }
                )
            }else{
                Note.updateOne(
                    {_id:toShare},
                    {$set: {"shared": "false"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }
                    }
                )
                NoteUser.updateOne(
                    {_id: req.user.id, "noteBookContents": {"$elemMatch":{"_id": toShare}}},
                    {$set: {"noteBookContents.$.shared": "false"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/page");
                        }
                    }
                )               
            }
        }
    })

})

//Go to page buttonn request
//---this creates multiple new pages for the users page
//creating a page to show the entries of users
app.get("/userContent/:pageId",isLoggedIn, function(req,res){
    

        //gets the title of the page that is going to be
        //created after the click --create page
        const pageEntry = req.params.pageId;

        const theUser = req.user.username;

        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                
        //search for the record with the same username as the currently logged in user
        NoteUser.findOne({"username": theUser},function(err, post){
        const newPage = post.noteBookContents;
        const pic= findpic.profileImage.url;
        //renders the userContent page
        //the data passed into it is the title of the page that the user is looking for
        //also the contents of the relavant noteBookContents of the found post     
        res.render("userContent",{pic,newPage:newPage, userthing: pageEntry});    


        })
    }});


})



//--------------------------------------------------------





//--------------------Public page------------------------------------
app.get("/publicPage",isLoggedIn, function(req,res){

        
        // finding the document of the current user for the purpos of getting the url
        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                

                //finding the user related entries by the id of currently logged in user
                Note.find({"shared": {$eq: "true"}, "deleted":{$ne: "true"}}, function(err, publicPosts){

                    if(err){
                        console.log(err);
                        
                                
                    }else{

                            const pic= findpic.profileImage.url;                
                            res.render("publicPage", {pic, publicPosts: publicPosts});
                        
                    }
                });
            }});
 
});


//----------------Creating multiple new pages for the public page
//creating a page to show the entries of users
app.get("/publicContent/:pageTitle", isLoggedIn, function(req,res){
    

    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.pageTitle;
    const currentUser = req.user.username;

    console.log(currentUser)


            Note.findById(pageEntry, function(err, foundEntry){
                if(err){
                    console.log(err);
                }else{
                    if(foundEntry){
                        // finding the document of the current user for the purpos of getting the url
                        NoteUser.findById(req.user.id, function(err, findpic){
                            if(err){
                                console.log(err);
                            }
                            else{
                                Review.find({"target":pageEntry}, function(err, foundReview){
                                    if(!err){
                                        
                                        foundEntry.reviews= foundReview;
                                        
                                        foundEntry.save(function(){
                                        //search for all records 
                                        Note.find({},function(err, post){
                                        const newPublicContent = post;
                                        const pic = findpic.profileImage.url;
                                        //renders the publicContent page
                                        //the data passed into it is the title of the page that the user is looking for
                                        //also the contents of the relavant noteBookContents of the found post     
                                        res.render("publicContent",{pic,newPublicContent:newPublicContent, pageEntry: pageEntry, currentUser: currentUser});

                                        })    
                                        
                                        });                        
                                    }

                            })
                             }});
                        }
                    }
                })
            

})

//--reviews section of public page
app.post("/review",isLoggedIn, function(req, res){
    const pageEntry = req.body.reviewContent;
    const content=req.body.content;
     console.log("afadfa");

             
    if(req.body != null){

    const review = new Review({
        content: content,
        target:pageEntry,
        author: req.user.username 
    });
    review.save();
}

        res.redirect("/publicContent/"+pageEntry);


})

app.post("/deleteReview",isLoggedIn, function(req, res){
        const clickedEntry = req.body.deleteReviews;
       
        Review.findByIdAndRemove({_id:clickedEntry, author:{$eq:req.user.username}}, function(err, found){
            if(err){
                console.log(err);
            }else{
                if(found)
                //redirects to the page where the target of the review is
                 res.redirect("/publicContent/"+found.target);

            }
        });
   

})


//-----SETTINGS PAGE--------------------------------------------------------------------

app.get("/settings",isLoggedIn, function(req, res){
    
        
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
app.post("/profileImg", isLoggedIn, parser.single("profileImage"), function(req,res) {

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
app.get("/trashBin", isLoggedIn, function(req,res) {

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
app.post("/deletePermanent", isLoggedIn, function(req, res) {
    const toDelete = req.body.deleteEntry;
    Review.deleteMany({"target":{$eq: toDelete}},function(err){
        if(err){
            console.log(err);
        }
    })

        Note.findByIdAndRemove(toDelete, function(err) {
            if(!err){
                console.log("Entry Deleted Permanently");
                res.redirect("/trashBin");
            }
        })

})

//--Rench button--the purpose is to undo the deletion on the main user page
app.post("/salvage-data",isLoggedIn, function(req, res) {
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
        res.redirect("/trashBin");


})

//----------------------------------------------------------------------


app.get("/check-out",isLoggedIn, (req,res)=>{
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
                    res.render("check-out", {pic, subscription: subscription});
                }
                    
            })
        }
    });

})

app.post("/check-out", isLoggedIn,async (req,res)=>{
    const priceId = req.body.subscription_type
        try{
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                //array of items that the user wants to purchase
                line_items: [
                    {
                        price:priceId,
                        quantity: 1,
                    },
                ],
                mode: 'payment', 
                success_url: `${process.env.SERVER_URL}/success`,
                cancel_url:  `${process.env.SERVER_URL}/cancel`,
            })
            res.redirect(303, session.url);
        } catch(e) {
            res.status(500).json({ error: e.message })
        }
        // try{
        //     const session = await stripe.checkout.sessions.create({
        //         payment_method_types: ['card'],
                
        //         //array of items that the user wants to purchase
        //         line_items: req.body.itemed.map(item =>{
        //             const storeItem = storeItems.get(item.id)
        //             return {
        //                 price_data: {
        //                     currency: 'usd',
        //                     product_data:{
        //                         name: storeItem.name
        //                     },
        //                     unit_amount: storeItem.priceInCents,
        //                 },
        //                 quantity: item.quantity,
        //             }
        //         }),
        //         mode: 'payment', 
        //         success_url: `${process.env.SERVER_URL}/success`,
        //         cancel_url:  `${process.env.SERVER_URL}/cancel`,
        //     })
        //     res.redirect({url: session.url})
        // } catch(e) {
        //     res.status(500).json({ error: e.message })
        // }
        
        //if subscription is not already chosen and active then can buy 
        //if not then cant buy
       //redirect to the url
    
})

app.get("/cancel", isLoggedIn, function(req,res){
    res.render("cancel");
})
app.get("/success", function(req,res){
    res.render("success");
})

//Admin product page




//-----------------Logout------------------------------------------
//log out page using the logout function
app.get("/logout", isLoggedIn, function(req,res, next){
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