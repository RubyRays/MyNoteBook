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


const app = express();



app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');



app.use(session({
    secret: process.env.SECRET,
    resave:false, 
    saveUninitialized: false, 
}));


app.use(passport.initialize());
app.use(passport.session());

const dbUsername= process.env.DBUSERNAME;
const dbPassword= process.env.DBPASSWORD;
const cluster =  process.env.CLUSTER;


// mongoose.connect("mongodb://localhost:27017/noteUserDB");
const dbUrl= "mongodb+srv://"+dbUsername+":"+dbPassword+cluster+"/notesAppDB?retryWrites=true&w=majority"

mongoose.connect(dbUrl).then(()=>{
    console.info("Database connected");
}).catch(err=> {console.log("Error",err);});

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
    noteBookContents: [notesSchema],
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
app.get("/404",function(req,res){
    res.render("404");
});
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
                    console.log(user2);
                    
                
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
});


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
    
//lllloo
    
})





//creating a page to show the entries of users
app.get("/userContent/:pageId", function(req,res){
    

    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.pageId;

    
    //redirects to the login if the user is not authenticated
     if(req.isAuthenticated()){
    const theUser = req.user.username;
    // console.log("page title: "+ pageEntry);
    // console.log("username:" + req.user.username);
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


//listener
app.listen(3000, function(){
    console.log("Server is running on port 3000");
})
