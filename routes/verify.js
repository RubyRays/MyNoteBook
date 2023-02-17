const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');


//-----VERIFICATION OF EMAIL ADDRESS PAGE-----------------
router.get("/", isLoggedIn, catchAsync(async(req, res)=>{
   
    const currentUser = await NoteUser.findById(req.user.id);
    const theme= currentUser.theme;
    res.render("verificationPage", {theme,currentUser:currentUser} );


     
}))

router.post("/", isLoggedIn, catchAsync(async(req, res)=> {
  
    const status = req.body.verificationCode;
    const userId =req.user.id;
    let verificationMessage=[];
    const currentUser = await NoteUser.findById(userId);
    if(status == currentUser.verificationCode){
        await NoteUser.updateOne({_id:userId},{"isVerified": true});
        res.redirect("/pages");
    }else{
        verificationMessage.push({msg: "Verification code not correct"});
        const theme = currentUser.theme;
        console.log(theme);
        res.render("verificationPage",{theme,verificationMessage, currentUser:currentUser});        
    }


}))
//--------------------------------------------------------

module.exports=router;