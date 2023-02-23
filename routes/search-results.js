const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');


//search result get request 
//renders the search page while sending userprofile image (pic)
//the theme info and the url of the current page
router.get("/", isLoggedIn, catchAsync(async(req, res)=>{
    
    const noteuser= await NoteUser.findById(req.user.id);
    const pic = noteuser.profileImage.url;
    const theme= noteuser.theme;
    const url="search-results"

    res.render("search-results", {pic, theme, url});
}));

//search result post request that recives payload data from fetch request 
router.post("/", isLoggedIn, catchAsync(async(req, res)=>{
    const payload = req.body.payload.trim();

    //searches for the entires similar to payload value and stores them inside of search constant
    const search = await Note.find({
                            title:{$regex: `${payload}`,  $options:"i"},
                            owner:{$eq:req.user.username}
                            }).exec();

    //sets a limit of 10 to the search results
    if(search.length > 10){
            search = search.slice(0,10);
    }

    res.send( {payload: search});



}))


module.exports=router;