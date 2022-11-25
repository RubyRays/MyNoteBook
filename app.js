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



const app = express();



app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');



app.use(session({
    secret: "my secret",
    resave:false, 
    saveUninitialized: false, 
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/noteUserDB");


const notesSchema = new mongoose.Schema({
    title: String,
    content:String,
    owner: String
});

const Note = new mongoose.model("Note", notesSchema);

const noteUserSchema =new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    noteBookContents:notesSchema,
    googleId: String

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

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/page",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
    function(accessToken, refreshToken, profile, cb){
        NoteUser.findOrCreate({googleId: profile.id, username: "User#"+profile.id}, function(err, user){
            return cb(err, user);
        })
    }
))

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
app.get("/page", function(req,res){
    //find the value from that specific user
    //res.render("page", {username: username});
   
    if(req.isAuthenticated()){
        
        const theUser = req.user.username;
        const theTitle= req.user.title;
        const theId= req.user.id;
        const thePost=req.user.post;
        


       
        //setting the owner name to be equal to the username
        NoteUser.find({"owner": {$eq: theUser},"noteBookContents": {$ne: null}}, function(err, foundUsers){
            //console.log(thepost2);
            //console.log("Show: "+ foundUsers);
            if(err){
                console.log(err);
                
                        
            }else{
                if(foundUsers){
                    //rendering the info got back from the ejs and the username where 
                     //needed on screen
                    res.render("page", {userContent:foundUsers, userthing: theUser} );
                 }
              }
           });
        
    }else{
        res.redirect("/login");
    }    

});




//log out page using the logout function
app.get("/logout", function(req,res){
    req.logout(function(err){
        if(err){
            return next(err)
        }
    });
    res.redirect("/");
})
app.post("/register", function(req, res){
    
    //looking for a way to trap the current username and values hopefully it is here
    //this is the place where the user is authenitcated
    NoteUser.register({username:req.body.username, email:req.body.email}, req.body.password, function(err,user){
        if(err){
            console.log(err);
            res.redirect("/");//if there are errors redirect to home
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/page");//redirect to the page
            })
        }
    })
});  

//login page that takes in the information input by the user and 
//authenticates it before rendering the page
app.post("/login", function(req,res){
   const user = new NoteUser({
    username: req.body.username,
    email:req.body.email,
    password: req.body.password
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

//creates a new notebook post that is then added to the noteBookContents
app.post("/page", function(req,res){
        //creates a new post
           const post=new Note({
            title: req.body.title,
            content: req.body.content,
            owner: req.user.username
        });
        //inserts the post data into the notebookContents of the authenticated user
    NoteUser.insertMany({noteBookContents: post}, function(err){
        if(err){
            console.log(err);
        }
        else{
            console.log("The list was updated");
        }
    });

    //finds the current user using the user.id provided by the passport package
    NoteUser.findById(req.user.id,function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                //saves the posted contents into the noteBookContents
                foundUser.noteBookContents=post;
                
                //saves the userinfo and redirects to the page
                foundUser.save(function(){
                    res.redirect("/page");
                });
            
            }
        }
    });
});


//listener
app.listen(3000, function(){
    console.log("Server is running on port 3000");
})
