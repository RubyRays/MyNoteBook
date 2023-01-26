const express = require('express');
const session = require('express-session');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const data = require("../data");
const nodemailer = require("nodemailer");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const { query } = require('express');



//-----------REGISTER----------------------------------------------
router.get("/", async(req, res)=>{
    res.render("register");
});


router.post("/", async(req, res, next)=>{
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
                               
                                res.redirect("/verify");

                            }
                        }
                    })
                })
            }
        })
        }
    
});  


module.exports=router;
