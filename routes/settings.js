
const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const catchAsync = require('../middleware/catchAsync');


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

router.get("/",isLoggedIn, catchAsync(async(req, res)=>{

        const currentUser = await NoteUser.findById(req.user.id);
        const pic = currentUser.profileImage.url;
        const theme = currentUser.theme;
        const url = "settings";
        res.render("settings", {pic,theme,url, currentUser:currentUser} );
        
  
}));
//----PROFILE IMAGE reuest 
//---deals with the profile image upload and only allows one image associated to the user
//to be stored in the cloudinary notebook folder
router.put("/profile-image", isLoggedIn, parser.single("profileImage"), catchAsync(async(req,res)=> {

    const path = req.file.path;
    const filename= req.file.filename;
    const noteuser = NoteUser.findById(req.user.id);
    if(noteuser.profileImage.filename != 'samples/sheep'){
             cloudinary.uploader.destroy(noteuser.profileImage.filename);
        }    
    await NoteUser.updateOne({_id:req.user.id},{"profileImage":{"url":path, "filename": filename }});
    res.redirect("/settings");



}));
router.put("/location", isLoggedIn, catchAsync(async(req, res)=>{
    const theUser = req.user.id;
    const noteuser = await NoteUser.findById(theUser);
    if(noteuser.locationAccess == "off"){
        await NoteUser.updateOne({_id: theUser}, {"locationAccess": "on"});
    }else{
         await NoteUser.updateOne({_id: theUser}, {"locationAccess": "off"});       
    }
    res.redirect("/settings");
    // res.send("changed location permission");
}))

//----------------------------------------------------------------------------------------
module.exports=router;