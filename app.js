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
const {level1Access, level2Access}= require('./access_middleware');
const Subscription = require('./models/Subscription');
const Session = require('./models/Session');
const { query } = require('express');
const ErrorHandle = ('./ErrorHandle.js');
//-----------------
//--helper functions for ejs
const instaClick = require('./clickBtn.js');
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
app.use(methodOverride('_method'));
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



//--HOME ROUTE----
app.get("/", async(req, res)=>{
    res.render("home");
}); 

//route for the google button---
app.get("/auth/google",
    passport.authenticate('google', {scope: ["profile"]})
    );
app.get("/auth/google/pages",
    passport.authenticate('google',{failureRedirect: "/login"}),
    function(req, res){
        res.redirect('/pages');
    }    
);

//-----------REGISTER----------------------------------------------
app.get("/register", async(req, res)=>{
    res.render("register", {messages: req.flash('fail')});
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
                    req.flash('fail', 'there is something wrong-username or email already in use!');
                    next(err);
                    // res.redirect('/');
                }
                catch{(err)
                    client.query("ROLLBACK") 
                    console.log("afdjalkfjldajfdkajfj");               
                  
                    return next(new CustomHandleError(400, 'something '))
                }           
            
            }else{    
                // sendMail()
                // .then((result)=> console.log(result))
                // .catch((error)=> console.log(error));
                note0.save();
                
                passport.authenticate("local")(req, res, function(){
                    NoteUser.findById(req.user.id, async (err, found)=>{
                        if(err){
                            console.log(err)
                            console.log("DJFKLDJAKFJAJFKAKFJKDJ")
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
    // email:req.body.email,
    password: req.body.password,
 
   });

   req.login(user, async(err)=>{
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




//-------------------MAIN PAGE FOR USER NOTES--------------------
app.get("/pages", isLoggedIn, async(req,res)=>{


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

                            res.render("page", {pic, messages: req.flash('success'), messages:req.flash('warning'), userContent: foundUser, theUser: theUser});
                                
                        })
                    })
                }
            }
        });
  

});

//renders the notebook user page
app.post("/pages",isLoggedIn, async(req,res)=>{
    
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

            res.redirect("/pages");

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
app.put("/pages/delete",isLoggedIn, async(req, res)=>{
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
                    res.redirect("/pages");
                    
                }
            }
            );

})

//--pen icon request-used to hide and unhide the edit form
app.put("/pages/pre-edit",isLoggedIn, async(req, res)=>{

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
                           
                            res.redirect("/pages");
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
                            
                            res.redirect("/pages");
                        }
                    }        
                )                
            }
        }
    })

})

 
//--edit button request- used to edit user entries
app.put("/pages/edit",isLoggedIn, async(req,res)=> {
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
                    res.redirect("/pages");
                }
            }        
        )
   

})

//--last icon (arrow in a box) request to share and unshare user entries
app.put("/pages/share-unshare",isLoggedIn,level1Access, async(req, res)=> {
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
                        }else{
                            res.redirect("/pages")
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
                        }else{
                            res.redirect("/pages")
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
app.get("/pages/:id",isLoggedIn, async(req,res)=>{
    

        //gets the title of the page that is going to be
        //created after the click --create page
        const pageEntry = req.params.id;

        const theUser = req.user.username;

        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                
        //search for the record with the same username as the currently logged in user
        NoteUser.findOne({"username": theUser}).populate('noteBookContents').exec(function(err, post){
            if(err){
                console.log(err);
            }else{
                const newPage = post.noteBookContents;
                const pic= findpic.profileImage.url;
                //renders the userContent page
                //the data passed into it is the title of the page that the user is looking for
                //also the contents of the relavant noteBookContents of the found post     
                res.render("userContent",{pic,newPage:newPage, pageEntry: pageEntry});    

            }
        

        })
    }});


})



//--------------------------------------------------------





//--------------------Public page------------------------------------
app.get("/public-pages",isLoggedIn,level1Access, async(req,res)=>{

        
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
app.get("/public-pages/:id", isLoggedIn, async(req,res)=>{
    
    
    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.id;
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
                                        Note.find({}).populate('reviews').exec(function(err, post){
                                        const newPublicContent = post;
                                        const pic = findpic.profileImage.url;
                                        //renders the publicContent page
                                        //the data passed into it is the title of the page that the user is looking for
                                        //also the contents of the relavant noteBookContents of the found post     
                                        res.render("publicContent",{pic,messages:req.flash('warning') ,newPublicContent:newPublicContent, pageEntry: pageEntry, currentUser: currentUser});

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
app.put("/public-pages/:id/review",isLoggedIn,level2Access, async(req, res)=>{
    const id= req.params.id;
    console.log("EQWEQWE: "+ id);
    const pageEntry = id;
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

        res.redirect("/public-pages/"+pageEntry);


})

app.delete("/public-pages/:id/review/delete",isLoggedIn,level2Access, async(req, res)=>{
    const id= req.params.id;    
    const clickedEntry = id;
       
        Review.findByIdAndRemove({_id:clickedEntry, author:{$eq:req.user.username}}, function(err, found){
            if(err){
                console.log(err);
            }else{
                if(found)
                //redirects to the page where the target of the review is
                 res.redirect("/public-pages/"+found.target);

            }
        });
   

})


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

//     if (window.performance) {
//   console.info("window.performance works fine on this browser");
// }

    //if session id == to something in the sessions list then only redirect the page
    //else save the session id and the name of the access
    //update status of access to equal the product name/description
  const productname = req.body.Name;
  const session_id= req.body.session_id; 
  const username= req.user.username;
  console.log("sessiong: "+ productname);
  console.log("session: "+ session_id);


//   const payment = await Session.find({"sessions":session_id})
//   console.log(payment);
//   //if it does not exsist
//   if(!payment){
//     const newpayment = await new Session({
//         sessions: session_id,
//         username: username,
//         item: productname, 
//     });
//     newpayment.save();
//     const newsubscription = await NoteUser.updateOne(
//     {"username":username},
//     {$set:{"accessType":productname}})

//     setTimeout(()=>
//     {res.redirect("/pages")},5000
//     );
//   }else{
//     console.log("Page reload detected");
//     res.redirect("/pages");
//   } 
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