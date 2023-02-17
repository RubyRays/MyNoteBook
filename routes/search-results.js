const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');



router.get("/", isLoggedIn, catchAsync(async(req, res)=>{
    
    const noteuser= await NoteUser.findById(req.user.id);
    const pic = noteuser.profileImage.url;
    const theme= noteuser.theme;
    const url="search-results"

    res.render("search-results", {pic, theme, url});
}));

router.post("/", isLoggedIn, catchAsync(async(req, res)=>{
    const payload = req.body.payload.trim();
    console.log("......"+ payload);
    const search = await Note.find({title:{$regex: `${payload}`,  $options:"i"}, owner:{$eq:req.user.username}}).exec();
    if(search.length > 10){
            search = search.slice(0,10);
    }

    res.send( {payload: search});



}))









module.exports=router;