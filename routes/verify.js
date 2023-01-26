const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');



//-----VERIFICATION OF EMAIL ADDRESS PAGE-----------------
router.get("/", isLoggedIn, async(req, res)=>{
   

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

router.post("/", isLoggedIn, async (req, res)=> {
    
    
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

module.exports=router;