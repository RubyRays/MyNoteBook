const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const Review = require("../models/Review");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');
const catchAsync = require('../middleware/catchAsync');




//---- TRASH BIN-----------------------------------
//trash route get request 
//renders a list of all the notes whose deleted field is marked true
//sends the current user data, profile picture, theme info and the route name of the page
router.get("/", isLoggedIn,level1Access,catchAsync(async(req,res)=> {
    const noteuser= await NoteUser.findById(req.user.id);
    const foundNoteEntry = await Note.find({"owner": req.user.username, "deleted": "true"});
    const pic = noteuser.profileImage.url;
    const theme = noteuser.theme;
    const url = "trash";
    res.render("trashBin", {pic,theme,url,foundNoteEntry:foundNoteEntry});



}));

//-----TRASHBIN BUTTONS

//--eraser icon- deletes the entry inside of the notes collection
// and also deletes the associated reviews
router.delete("/delete", isLoggedIn,level1Access, catchAsync(async(req, res)=> {

    const toDelete = req.body.deleteEntry;
    //deletes the entry with the Review target field equal to the toDelete value
    //deletes the note entry with the id equal to the toDelete value
    await Review.deleteMany({"target":{$eq: toDelete}});
    await  Note.findByIdAndRemove(toDelete);
    res.redirect("/trash");

 
}));

//--wrench button--the purpose is to undo the deletion on the main user page
router.put("/salvage",isLoggedIn,level1Access, catchAsync(async(req, res)=> {
    //gets data from the input field named salvage in trashBin ejs
    const fix = req.body.salvage;
    //updates the deleted field to false if the id is equal to the fix value
    await Note.updateOne({_id: fix},{"deleted": "false"});
    res.redirect("/trash"); 

}));

module.exports=router;