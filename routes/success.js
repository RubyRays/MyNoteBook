const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const stripe= require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const Session = require('../models/Session');
const catchAsync = require('../middleware/catchAsync');



router.get("/",isLoggedIn, catchAsync(async(req,res)=>{
    theUser = req.user.username;
    const session_id = req.query.id
    
    const session= await stripe.checkout.sessions.listLineItems(req.query.id,{
        expand:['data'],
    });
   
    res.render("success", {theUser:theUser, session:session, session_id:session_id});
}));

router.put("/", isLoggedIn, catchAsync(async(req,res)=>{



    //if session id == to something in the sessions list then only redirect the page
    //else save the session id and the name of the access
    //update status of access to equal the product name/description
    const productname = req.body.Name;
    const session_id= req.body.session_id; 
    const username= req.user.username;
    console.log("sessiong: "+ productname);
    console.log("session: "+ session_id);

    Session.findOne({"sessions":session_id}, function(err, findSession){
        if(!err){
            const newSession = new Session({
                sessions: session_id,
                username: username,
                item: productname, 
            });
            newSession.save();
            NoteUser.updateOne(
                {"username":username},
                {$set:{"accessType":productname}},
                function(err){
                    if(err){

                    }else{
                        setTimeout(()=>
                        {   
                            console.log("session updated");
                            res.redirect("/pages");
                        },5000
                        );
                    }
                }


                    )
                }else{
                    console.log("refresh detected");
                    res.redirect("/pages");

                }
})




}));

module.exports=router;