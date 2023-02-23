const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const stripe= require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const Session = require('../models/Session');
const catchAsync = require('../middleware/catchAsync');


//success page get request 
//sends session data obtained from stripe
router.get("/",isLoggedIn, catchAsync(async(req,res)=>{
    theUser = req.user.username;
    const noteuser = await NoteUser.findById(req.user.id);
    const theme = noteuser.theme;
    //stores the session id obtained from the url 
    const session_id = req.query.id
    
    //singles out the stripe product data using expand
    const session= await stripe.checkout.sessions.listLineItems(req.query.id,{
        expand:['data'],
    });
   
    res.render("success", {theme:theme, theUser:theUser, session:session, session_id:session_id});
}));

//success page post request that obtains data from the success page 
router.put("/", isLoggedIn, catchAsync(async(req,res)=>{

    //if session id == to something in the sessions list then only redirect the page
    //else save the session id and the name of the access
    //update status of access to equal the product name/description
    const productname = req.body.Name;
    const session_id= req.body.session_id; 
    const username= req.user.username;

    Session.findOne({"sessions":session_id}, function(err, findSession){
        if(!err){
            //creates a new document and stores it inside 
            //the sessions collection to keep track of all successful transactions
            const newSession = new Session({
                sessions: session_id,
                username: username,
                item: productname, 
            });
            newSession.save();
            
            //updates the accessType to the value of bought subscription
            NoteUser.updateOne(
                {"username":username},
                {$set:{"accessType":productname}},
                function(err){
                    if(err){

                    }else{
                        //redirects the page to main page after 5 seconds
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