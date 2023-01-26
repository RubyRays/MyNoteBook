
const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


//---------cloudinary configuration-------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "MyNoteBook",
        allowedFormats: ['jpeg', 'png', 'jpg'] 
    } 
    
});

const parser = multer({storage:storage});

//--------------------------------------------------------

//-----SETTINGS PAGE--------------------------------------------------------------------

router.get("/",isLoggedIn, async(req, res)=>{
    
        
        // finding the document of the current user for the purpos of getting the url
        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                //finding the user related entries by the id of currently logged in user
                NoteUser.findById(req.user.id, function(err, currentUser){

                    if(err){
                        console.log(err);
                        
                                
                    }else{
                        if(currentUser){
                            //finding the url
                            const pic = findpic.profileImage.url;
                            //rendering the settings page
                            res.render("settings", {pic, currentUser:currentUser} );
                        }
                    }
                });
            }});
  
})
//----PROFILE IMAGE reuest 
//---deals with the profile image upload and only allows one image associated to the user
//to be stored in the cloudinary notebook folder
router.put("/profile-image", isLoggedIn, parser.single("profileImage"), async(req,res)=> {

    const path = req.file.path;
    const filename= req.file.filename;


    //find the currently referenced image and delete it
    NoteUser.findById(req.user.id, function(err, foundUser){
        if(foundUser.profileImage.filename != 'samples/sheep'){
             cloudinary.uploader.destroy(foundUser.profileImage.filename);
        }
       
    })

    NoteUser.updateOne(
        {_id:req.user.id},
        {$set: {"profileImage":{"url":path, "filename": filename }}},
        function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/settings");
                        }
                    }
    )

})

//----------------------------------------------------------------------------------------
module.exports=router;