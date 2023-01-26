const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const Review = require("../models/Review");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');





//---- TRASH BIN-----------------------------------
router.get("/", isLoggedIn,level1Access, async(req,res)=> {

        NoteUser.findById(req.user.id, function(err, findpic) {

            if(err){

                console.log(err);

            }else{
                
                Note.find({"owner": req.user.username, "deleted": "true"}, function(err, foundNoteEntry) {

                    if(err){

                        console.log(err);
                        
                    }else{
                        
                        const pic = findpic.profileImage.url;

                        res.render("trashBin", {pic,foundNoteEntry:foundNoteEntry})
                    }
                })
            }
        });

});

//-----TRASHBIN BUTTONS

//--eraser icon- deletes the entry inside of the notes collection
// and also deletes the associated reviews
router.delete("/delete", isLoggedIn,level1Access, async(req, res)=> {
    const toDelete = req.body.deleteEntry;
    Review.deleteMany({"target":{$eq: toDelete}},function(err){
        if(err){
            console.log(err);
        }
    })

        Note.findByIdAndRemove(toDelete, function(err) {
            if(!err){
                console.log("Entry Deleted Permanently");
                res.redirect("/trash");
            }
        })

})

//--Rench button--the purpose is to undo the deletion on the main user page
router.put("/salvage",isLoggedIn,level1Access, async(req, res)=> {
    const fix = req.body.salvage;
   
         //updating the status of the deleted note to false
        Note.updateOne(
            {_id: fix},
            {$set: {"deleted": "false"}},
                function(err) {
                if(err) {
                    console.log(err);
                }
            }
        )        
        res.redirect("/trash");


})

module.exports=router;