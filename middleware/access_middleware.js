
const NoteUser = require("../models/NoteUser");

//user with basic access gets redirected to their top accessable
//page option then a flash message is shown
module.exports.level1Access = async(req,res, next)=>{
    const userId = req.user.id;
    
    //find user
    const users = await NoteUser.findById(userId);

    if(users.accessType =="default"){
        req.flash('warning', "Your access is not high enough");
        return res.redirect("/pages");
    }
    next();
}

//redirects all users whose accessType is not Pro
//then shows a flash message
module.exports.level2Access= async(req, res, next)=>{
    const userId = req.user.id;
    const pageId = req.params.id;

    const users = await NoteUser.findById(userId);
    if(users.accessType !="Pro"){
        req.flash('warning', "Your access is not high enough: Pro level needed");
        return res.redirect("/public-pages/"+ pageId);
    }
    next();
}