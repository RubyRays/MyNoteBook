const express = require('express');
const router = express.Router();
const NoteUser= require('../models/NoteUser');
const Subscription = require('../models/Subscription');
const {isLoggedIn} = require('../middleware/login_middlewaare');
const stripe= require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const catchAsync = require('../middleware/catchAsync');

//check out routes

//check out get request that renders the page and sends 
//user profile picture (pic), theme data, url of page and all of the subscription 
//documents
router.get("/",isLoggedIn, catchAsync(async(req,res)=>{

    const noteuser = await NoteUser.findById(req.user.id);
    const subscription = await Subscription.find({});
    const pic = noteuser.profileImage.url;
    const theme = noteuser.theme;
    const url = "checkout";
    res.render("checkout", {pic,theme,url, subscription: subscription});


}));


//check out post request that:
//creates a new session along with the necessary information needed for purchase
//redirects on sucess to the sucess page or cancel page upon failure
router.post("/", isLoggedIn, catchAsync(async(req,res)=>{


        try{        
            const id = req.body.subscription_type;
            const data = await Subscription.findById(id);
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                //array of items that the user wants to purchase
                line_items: [
                    {
                        price_data: {
                            
                            currency:'usd',
                            product_data:{
                                name: data.type,
                            },
                               unit_amount_decimal:data.price *100, 
                            },
                            quantity: 1,
                    },
                ],
                mode: 'payment', 

                success_url: `${process.env.SERVER_URL}/success?id={CHECKOUT_SESSION_ID}`,
                cancel_url:  `${process.env.SERVER_URL}/cancel`,
            })

            res.redirect(303, session.url);
        } catch(e) {
            res.status(500).json({ error: e.message })
        }

    
}));

module.exports=router;