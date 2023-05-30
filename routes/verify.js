const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');


//-----VERIFICATION OF EMAIL ADDRESS PAGE-----------------

//verification page route get request that renders the verification page
//of the current user
router.get("/", isLoggedIn, catchAsync(async(req, res)=>{
   
    const currentUser = await NoteUser.findById(req.user.id);
    const theme= currentUser.theme;
    const vCode= currentUser.verificationCode;
    res.render("verificationPage", {theme,vCode,currentUser:currentUser} );


     
}))



//verification page post request that accepts the data from the 
//verification form and compares the data to the verification code
//associated with the current user
router.post("/", isLoggedIn, catchAsync(async(req, res)=> {
  
    const code = req.body.verificationCode;
    const userId =req.user.id;
    let verificationMessage=[];
    const currentUser = await NoteUser.findById(userId);
    //if code is the same as the verification code then update isVerified to true and redirect to main page
    //otherwise send a verification message and render the verification page again
    if(code == currentUser.verificationCode){
        await NoteUser.updateOne({_id:userId},{"isVerified": true});
        res.redirect("/pages");
    }else{
        verificationMessage.push({msg: "Verification code not correct"});
        const theme = currentUser.theme;
        res.render("verificationPage",{theme,verificationMessage, currentUser:currentUser});        
    }


}))
//--------------------------------------------------------

module.exports=router;