//adding the requirements 
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require('ejs');
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require("lodash");
const data = require(__dirname+"/data.js");
const https = require("https");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const e = require('express');



const app = express();



app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

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


app.use(session({
    secret: process.env.SECRET,
    resave:false, 
    saveUninitialized: false, 
}));


app.use(passport.initialize());
app.use(passport.session());

//---------------------------------------------
// const dbUsername= process.env.DBUSERNAME;
// const dbPassword= process.env.DBPASSWORD;
// const cluster =  process.env.CLUSTER;
//--------------------------------------------

mongoose.connect("mongodb://localhost:27017/noteUserDB");
//-----------------------------------------------------------------------
// const dbUrl= "mongodb+srv://"+dbUsername+":"+dbPassword+cluster+"/notesAppDB?retryWrites=true&w=majority"

// mongoose.connect(dbUrl).then(()=>{
//     console.info("Database connected");
// }).catch(err=> {console.log("Error",err);});

//----------------------------------------------------------------------

const notesSchema = new mongoose.Schema({
    title: String,
    content:String,
    owner: String,
    state: String,
    date: String,
    time: String,
    imageURL: String,
    shared: String,

});

const Note = new mongoose.model("Note", notesSchema);


const noteUserSchema =new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    noteBookContents: [notesSchema],
    googleId: String,
    profileImage:{
        url: String,
        filename: String
    }

});




noteUserSchema.plugin(passportLocalMongoose);
noteUserSchema.plugin(findOrCreate);


const NoteUser = new mongoose.model("NoteUser", noteUserSchema);



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

//-----------------Google--------------------------
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/page",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
    function(accessToken, refreshToken, profile, cb){
        NoteUser.findOrCreate({googleId: profile.id, username: "User#"+profile.id,     profileImage:{
        url: "https://res.cloudinary.com/dbvhtpmx4/image/upload/v1671056080/samples/sheep.jpg",
        filename:'samples/sheep' ,
    }   }, function(err, user){
            return cb(err, user);
        })
    }
))
//-------------------------------------------------------------------

app.get("/", function(req, res){
    res.render("home");
}); 

//route for the google button
app.get("/auth/google",
    passport.authenticate('google', {scope: ["profile"]})
    );
app.get("/auth/google/page",
    passport.authenticate('google',{failureRedirect: "/login"}),
    function(req, res){
        res.redirect('/page');
    }    
);

app.get("/register", function(req, res){
    res.render("register");
});  
app.get("/login", function(req, res){
    res.render("login");
}); 
app.get("/404",function(req,res){
    res.render("404");
});


//-------------------User page--------------------
app.get("/page", function(req,res){
    //find the value from that specific user
    //res.render("page", {username: username});
    
   
    if(req.isAuthenticated()){
        
        
        const theUser = req.user.username;
        
        //finding the user related entries by the id of currently logged in user
        NoteUser.findById(req.user.id, function(err, foundUsers){

            if(err){
                console.log(err);
                
                        
            }else{
                if(foundUsers){
                    //console.log("These are the found users: "+ foundUsers + "THE END ")
                    //rendering the info got back from the ejs and the username where 
                     //needed on screen
                     //passing in the found data
                    res.render("page", {userContent:foundUsers, userthing: theUser } );
                 }
              }
           });
        
    }else{
        res.redirect("/login");
    }    

});

//---------------creating multiple new pages for the users page---------------------------
//creating a page to show the entries of users
app.get("/userContent/:pageId", function(req,res){
    

    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.pageId;

    
    //redirects to the login if the user is not authenticated
     if(req.isAuthenticated()){
    const theUser = req.user.username;

    //search for the record with the same username as the currently logged in user
    NoteUser.findOne({"username": theUser},function(err, post){
    const newPage = post.noteBookContents;
    
    //renders the userContent page
    //the data passed into it is the title of the page that the user is looking for
    //also the contents of the relavant noteBookContents of the found post     
    res.render("userContent",{newPage:newPage, userthing: pageEntry});


            


    })
    }else{
        res.redirect("/login");
    }

})

//--------------------Public page------------------------------------
app.get("/publicPage",function(req,res){
     if(req.isAuthenticated()){
        
        
        const theUser = req.user.username;
        
        //finding the user related entries by the id of currently logged in user
        Note.find({"shared": {$eq: "true"}}, function(err, publicPosts){

            if(err){
                console.log(err);
                
                        
            }else{
               
                    res.render("publicPage", {publicPosts: publicPosts});
                 
              }
           });
        
    }else{
        res.redirect("/login");
    }    
});


//----------------Creating multiple new pages for the public page----------------------------------
//creating a page to show the entries of users
app.get("/publicContent/:pageTitle", function(req,res){
    

    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.pageTitle;

    
    //redirects to the login if the user is not authenticated
     if(req.isAuthenticated()){
    

    //search for the record with the same username as the currently logged in user
    Note.find({},function(err, post){
    const newPublicContent = post;
    
    //renders the publicContent page
    //the data passed into it is the title of the page that the user is looking for
    //also the contents of the relavant noteBookContents of the found post     
    res.render("publicContent",{newPublicContent:newPublicContent, pageEntry: pageEntry});

    
            


    })
    }else{
        res.redirect("/login");
    }

})


//-----------------Login------------------------------------------
//log out page using the logout function
app.get("/logout", function(req,res){
    req.logout(function(err){
        if(err){
            return next(err)
        }
    });
    res.redirect("/");
})

//-----------register----------------------------------------------
app.post("/register", function(req, res){
    let date=data.getDay();
    let time= data.getTime();
    const note0 = new Note({
        title: "User "+req.body.username+" created.",
        date:date,
        time:time
    })
    note0.save();
//------------------------------------------------------------------
    // const note1 = new NoteUser({
    //     title: "Welcome",
    //     content: "This is what a note looks like.",
    //     owner: req.body.username
    // })
    // const note2= new NoteUser({

    //     title: "Icons: eraser, pencil, share button",
    //     content: "The eraser deletes the note directly below, the pencil activates the edit feature and the share button adds or removes the note from the public page",
    //         owner: req.body.username 
    // })

    // const note3 =new NoteUser({
        
    //     title: "Additional Features",
    //     content: "The globe above leads to the public page while the profile picture can be changed according to the image uploaded.",
    //         owner: req.body.username
    // })

    // const defaultNotes = [note1, note2, note3];

    // NoteUser.noteBookContents.insertMany(defaultNotes, function(err){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         console.log("sucessfully added default notes");
    //     }
    // })
//----------------------------------------------------------------------------------
    //this is the place where the user is authenitcated
    const {password, username,email}= req.body;
    let errorMessage =[];
                  NoteUser.findOne({email:email}, function(err){
                    if(!err){
                        errorMessage.push({msg:"Email already used"});
                    }
                  })
        if(errorMessage.length > 0){
            res.render('register', (errorMessage, username, email));
            console.log(errorMessage);
        }else{
            NoteUser.findOne({username: username})
                .then(user=>{
                    if(user){
                    errorMessage.push({msg: "User exsists"});
                    res.render("register", {errorMessage, username,email,password })
                    }
                })
            }
            if(password.length <8){
                errorMessage.push({msg:"Password needs to be atleast 8 characters"});
            }
        

        if(errorMessage.length == 0){
        NoteUser.register({username:req.body.username, email:req.body.email, profileImage:{
                    url: "https://res.cloudinary.com/dbvhtpmx4/image/upload/v1671056080/samples/sheep.jpg",
            filename:'samples/sheep',
        }   },
        
        req.body.password, function(err,user){
            if(err){
                console.log(err);
                
                res.redirect("/register");//if there are errors redirect to home
            }else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/page");//redirect to the page
                })
            }
        })
    
    }
});  

//login page that takes in the information input by the user and 
//authenticates it before rendering the page
app.post("/login", function(req,res){
   const user = new NoteUser({
    username: req.body.username,
    email:req.body.email,
    password: req.body.password,
 
   });

   req.login(user, function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local")(req, res, function(){
            res.redirect("/page");
            
        })
    }
   });

});

//renders the notebook user page
app.post("/page", function(req,res){
    
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
             //designating the path
            const temp = weatherData.main.temp;
              callback(imageURL);
            })
        })
    }
    function handleResults2(results2){
        let date=data.getDay();
        let time= data.getTime();

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
        //finds the current user using the user.id provided by the passport package
        NoteUser.findById(req.user.id,function(err, foundUser){
            if(err){
                console.log(err);
            }else{
                if(foundUser){
                //looking for the data in the notes collection where the owner name
                //is the same as the username of the currently logged in user
                    Note.find({"owner": req.user.username}, function(err, user2){
                    //console.log(user2);
                    
                
                //saves the posted contents into the noteBookContents
                    foundUser.noteBookContents=user2;
                //saves the userinfo into noteUser collection and redirects to the page
                    foundUser.save(function(){
                        res.redirect("/page");
                });
            })
            }
        }
    });
    }
    makeCall2(weatherUrl, function(results2){
        handleResults2(results2);
    })
    }
    makeCall(ipinfoApi, function(results){
        
        handleResults(results);
    })

     


 }

);


app.post("/delete", function(req, res){
    //distinguishing things to delete
    const clickedEntry = req.body.deleteEntry;

    if(req.isAuthenticated()){
    //finds the entry that has the same id as the clicked entry and 
    //removes it
    Note.findByIdAndRemove(clickedEntry, function(err){
        if(!err){
            
            console.log("Entry Deleted");
            
        }
    });
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
    }else{
        res.redirect("/login");
    }
    

    
})
app.post("/preEdit", function(req, res){
    const editState = req.body.editEntry;
    //find the state of the entry being clicked and toggle it between edit-mode and normal-mode
 
        NoteUser.updateOne(
            {_id: req.user.id, "noteBookContents":{"$elemMatch": {"_id": editState}}},
            {$set: {"noteBookContents.$.state":"edit-mode"}},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("edit page button pressed");
                    res.redirect("/page");
                }
            }
        );
                })

 

app.post("/edit", function(req,res){
    const toEdit = req.body.Edit;
    const title= req.body.title2;
    const content=req.body.content2;

    //distinguishing things to delete
    // const editedEntry = req.body.Edit;
    // console.log("passed here");
    if(req.isAuthenticated()){
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
                res.redirect("/page");
            }
         }
    );

         //updates the state everytime the edit page button is clicked on
        NoteUser.updateOne(
        {_id: req.user.id, "noteBookContents":{"$elemMatch": {"_id": toEdit}}},
        {$set: {"noteBookContents.$.state":"normal-mode"}},
        function(err){
            if(err){
                console.log(err);
            }else{
                console.log("edit page button pressed");
                
            }
         }
    );
        
    }else{
        res.redirect("/login");
    }
    
   

})

app.post("/share&unshare", function(req, res){
    const toShare= req.body.share;
    //finding the entry by its id
    Note.findById(toShare, function(err, foundNoteEntry){
        if(err){
            console.log(err);
        }else{
            //checking the shared state
            //if the state is false when clicked change it to true
            //otherwise change it to false
            if(foundNoteEntry.shared === "false"){
                Note.updateOne(
                    {_id: toShare},
                    {$set: {"shared": "true"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/page")
                        }
                    }
            ) 
            }else{
                Note.updateOne(
                    {_id: toShare},
                    {$set: {"shared": "false"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/page")
                        }
                    }
                )               
            }
        }
    })

})

//---deals with the profile image upload and only allows one image associated to the user
//to be stored in the cloudinary notebook folder
app.post("/profileImg", parser.single("profileImage"), function(req,res){
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
                            res.redirect("/page")
                        }
                    }
    )

})



//customising the port to be used for local and heroku....
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function(){
    console.log("Server has started successfully");
});