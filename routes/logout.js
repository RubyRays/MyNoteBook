const express = require('express');
const router = express.Router();
const {isLoggedIn} = require('../middleware/login_middlewaare');

//-----------------Logout------------------------------------------
//log out page using the logout function
router.get("/", isLoggedIn, async(req,res, next)=>{
    req.logout(function(err){
        if(err){
            return next(err)
        }
    });
    res.redirect("/");
})

//-------------------------------------------------------------------

module.exports = router;