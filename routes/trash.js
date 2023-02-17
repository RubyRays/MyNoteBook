const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const Review = require("../models/Review");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');
const catchAsync = require('../middleware/catchAsync');




//---- TRASH BIN-----------------------------------
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
    await Review.deleteMany({"target":{$eq: toDelete}});
    await  Note.findByIdAndRemove(toDelete);
    res.redirect("/trash");

 
}));

//--Rench button--the purpose is to undo the deletion on the main user page
router.put("/salvage",isLoggedIn,level1Access, catchAsync(async(req, res)=> {
 
    const fix = req.body.salvage;
    await Note.updateOne({_id: fix},{"deleted": "false"});
    res.redirect("/trash");
 



}));

module.exports=router;