const NoteUser = require("./models/NoteUser");

module.exports.level1Access = async(req,res, next)=>{
    const userId = req.user.id;
    const pagePath= req.path;
    console.log("Hi path: "+ pagePath);
    //find user
    const users = await NoteUser.findById(userId);
    //user with basic access gets redirected to their top accessable
    //page option then a flash message is shown
    if(users.accessType =="default"){
        req.flash('warning', "Your access is not high enough");
        return res.redirect("/pages");
    }
    next();
}

module.exports.level2Access= async(req, res, next)=>{
    const userId = req.user.id;
    const pageId = req.params.id;
    console.log(pageId);
    const users = await NoteUser.findById(userId);
    if(users.accessType !="Pro"){
        req.flash('warning', "Your access is not high enough: Pro level needed");
        return res.redirect("/public-pages/"+ pageId);
    }
    next();
}