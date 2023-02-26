const express = require('express');
// const session = require('express-session');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const data = require("../data");
const nodemailer = require("nodemailer");
const passport = require("passport");
const {google, dlp_v2} = require ("googleapis");
const { OAuth2Client } = require('google-auth-library');
const OAuth2 = google.auth.OAuth2;
//OAuth routes
const oAuth2Client= new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN})




//-----------REGISTER----------------------------------------------
router.get("/", async(req, res)=>{
    const theme= "default";
    res.render("register", {theme:theme});
});

//register post request that stores a note 
//that records the time of user account creation
router.post("/", async(req, res, next)=>{
    let date=data.getDay();
    let time= data.getTime();
    const note0 = new Note({
        title: "User "+req.body.username+" created.",
        date:date,
        time:time
    })
    
//-----------------------------------------------------
//creates a random string of numbers and stores it in a 
//variable called code
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
        //stores the access token and creates a transport 
        //using the username, app password and other information 
        //provided by google and gmail that allows node mailer to work with gmail
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
        
        //sends an email with the verifcation code from the specified email to 
        //the email that the user created their account with
        const mailOptions={
            from: "jereenleblanc.volunteer@rnd4impact.com",
            to: req.body.email,
            subject: "testing email",
            text:"Hi "+req.body.username+",\n\nThanks for registering for an account on MyNoteBook. To verify your account input this code: "+ code+".\n\nBest Regards, MyNoteBook"
        };

        //Makes sure that the email is sent properly
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
    
    //gets the password from the registration form
    const password= req.body.password; 
    const password2 = req.body.password2;
    if(password == password2){
    //Returns an error if the password is less than 8 characters long
    if(password.length < 8){
        req.flash('warning',"Password needs to be 8 or more characters long.");
        res.redirect("/register");
    }else{

        //creates the user using the built in register function of passport
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
                    
                    req.flash('warning', 'There was something wrong-username or email');
                    res.redirect('/register');      
            
            }else{    
                sendMail()
                .then((result)=> console.log(result))
                .catch((error)=> console.log(error));
                note0.save();
                passport.authenticate("local")(req, res, function(){
                    //redirects to main page if isVerified is true otherwise 
                    //redirect to the verify page
                    NoteUser.findById(req.user.id, async (err, found)=>{
                        if(err){
                            console.log(err)
                        }else{
                            if(found.isVerified == true){
                                res.redirect("/pages");
                            }else{
                               
                                res.redirect("/verify");

                            }
                        }
                    })
                })
            }
        })
        }
    }else{
        req.flash('warning',"Passwords do not match.");
        res.redirect("/register");
    }
    
});  


module.exports=router;
