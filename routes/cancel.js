const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');

//gets the cancel page
router.get("/", isLoggedIn, catchAsync(async(req,res)=>{
    const noteuser = await NoteUser.findById(req.user.id);
    const theme = noteuser.theme;
    res.render("cancel", {theme:theme});
}));

module.exports = router;