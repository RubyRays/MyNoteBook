const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const Review = require("../models/Review");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');
const catchAsync = require('../middleware/catchAsync');
const { deleteOne } = require('../models/Note');


//--------------------Public page------------------------------------

//public page route
//stores the url of the profile image inside of pic 
//stores the theme data inside of theme 
//stores the url of the page inside of url
//then renders the public page
router.get("/",isLoggedIn,level1Access, catchAsync(async(req,res)=>{

        const noteuser= await NoteUser.findById(req.user.id);
        const publicPosts = await Note.find({"shared": {$eq: "true"}, "deleted":{$ne: "true"}});
        const pic = noteuser.profileImage.url;
        const theme = noteuser.theme;
        const url = "public-pages";
        res.render("publicPage", {pic,theme,url, publicPosts: publicPosts});              

 
}));


//----------------Creating multiple new pages for the public page

//creating a page to show the full contents of the entries of users
router.get("/:id", isLoggedIn, catchAsync(async(req,res)=>{

    //gets the title of the page that is going to be created after the click --create page
    const pageEntry = req.params.id;
    const currentUser = req.user.username;

    Note.findById(pageEntry, function(err, foundEntry){
        if(err){
            console.log(err);
        }else{
            if(foundEntry){
                // finding the document of the current user for the purpos of getting the url
                NoteUser.findById(req.user.id, function(err, findpic){
                    if(err){
                        console.log(err);
                    }
                    else{
                        Review.find({"target":pageEntry}, function(err, foundReview){
                            if(!err){
                                
                                foundEntry.reviews= foundReview;
                                
                                foundEntry.save(function(){
                                //search for all records 
                                Note.find({}).populate('reviews').exec(function(err, post){
                                const newPublicContent = post;
                                const pic = findpic.profileImage.url;
                                const theme = findpic.theme;
                                const url = "public-pages/"+ pageEntry;
                                //renders the publicContent page
                                //the data passed into it is the title of the page that the user is looking for
                                //also the contents of the relavant noteBookContents of the found post     
                                res.render("publicContent",{pic,theme, url, newPublicContent:newPublicContent, pageEntry: pageEntry, currentUser: currentUser})
                                })    
                                        
                                });                        
                            }

                    })
                     }});
                }
            }
        })
            

}));

//--reviews section of public page
//creates the reviews on the publicContents page
router.put("/:id/review",isLoggedIn,level2Access, catchAsync(async(req, res)=>{
    //store the id inside of the url
    const id= req.params.id;
    const pageEntry = id;
    //store the content of the reviews form
    const content=req.body.content;

    if(req.body != null){
    //creates and saves a review document into the database 
    const review = new Review({
        content: content,
        target:pageEntry,
        author: req.user.username 
    });
    review.save();
}
        res.redirect("/public-pages/"+pageEntry);

}));

//public page review route delete request
//deletes the review entry
router.delete("/:id/review/:target/delete",isLoggedIn,level2Access, catchAsync(async(req, res)=>{
    const id= req.params.id;
    const target= req.params.target;   
    const clickedEntry = id; 
    // delete review if the id is equal to the target and the current user is the author 
    await Review.deleteOne({_id:target, author:{$eq:req.user.username}});
    res.redirect("/public-pages/"+clickedEntry);

   

}));


//public page reviews route that is responsible for the like button update
router.put("/:id/review/:target/like",isLoggedIn,level2Access, catchAsync(async(req, res)=>{
    const id= req.params.id;
    const target= req.params.target;
    const theUser = req.user.username;
    const clickedEntry = id; 
    const likes = await Review.findById(target);

    if(theUser != likes.author){
        //look into the list of commenters for the review post
        //if the user is not the author and clicks the button then:
        //if their reaction is stored in database as:
        // dislike then return dislike
        // like then return like
        // otherwise return first-reaction
        let c = 0;
        likes.commenter.forEach(function(names){
            if(names.name == theUser && names.reaction== "like"){
                c = "like";
                return c;
            }
            else if(names.name == theUser && names.reaction== "dislike"){
                c = "dislike";
                return c;
            }
            else{
                c = "first-reaction";
                return c;
            }
        })
        console.log(c)
        
        const like_count = likes.likes;
        const dislike_count = likes.dislikes;
        //if it is the first click of the button then add 1 to the like count 
        //and update reaction to like
        if(c == "first-reaction"|| c == 0){
        await Review.updateOne({_id:target},{likes: (like_count + 1)});
        await Review.updateOne({_id:target}, {$push: {commenter: [{name:theUser, reaction: "like"}]}});
        }
        //if c is dislike then update like count by 1 and decrease dislike count by 1
        //update reaction to like
        else if(c == "dislike"){
        await Review.updateOne({_id:target},{likes: (like_count + 1), dislikes: (dislike_count -1)});
        await Review.updateOne({_id:target}, {$push: {commenter: [{name:theUser, reaction: "like"}]}});
        }
        //if c is like then return a flash message upon redirect
        else if(c=="like"){
                req.flash('warning', 'You have already liked this');

        }
        res.redirect("/public-pages/"+clickedEntry);
    }else{
        //place holder response to keep page from waiting for a response
       res.status(200);
    }
}));

//public page reviews route that is responsible for the dislike button update
router.put("/:id/review/:target/dislike",isLoggedIn,level2Access, catchAsync(async(req, res)=>{
    const id= req.params.id;
    const target= req.params.target;
    const theUser = req.user.username;  
    const clickedEntry = id; 
    const dislikes = await Review.findById(target);
    //if the user is not the author and clicks the button then:
    //if their reaction is stored in database as:
    // dislike then return dislike
    // like then return like
    // otherwise return first-reaction
    if(theUser != dislikes.author){
        let c = 0;
        dislikes.commenter.forEach(function(names){  

            if(names.name == theUser && names.reaction== "dislike"){
                c = "dislike";
                return c;
            }
            else if(names.name == theUser && names.reaction== "like"){
                c = "like";
                return c;
            }
            else{
                c = "first-reaction";
                return c;
            }
        })
    
        
        const dislike_count = dislikes.dislikes;
        const like_count = dislikes.likes;    
        //if it is the first click of the button then add 1 to the dislike count 
        //and update reaction to dislike
        if(c == "first-reaction" || c == 0){
        await Review.updateOne({_id:target},{dislikes: (dislike_count + 1)});
        await Review.updateOne({_id:target}, {$push: {commenter: [{name:theUser, reaction: "dislike"}]}});
        }
        //if c is like then update dislike count by 1 and decrease like count by 1
        //update reaction to dislike
        else if(c == "like"){
        await Review.updateOne({_id:target},{dislikes: (dislike_count + 1), likes: (like_count - 1)});
        await Review.updateOne({_id:target}, {$push: {commenter: [{name:theUser, reaction: "dislike"}]}});
        }
        //if c is dislike then return a flash message upon redirect
        else if(c=="dislike"){
                req.flash('warning', 'You have already disliked this');

        }

        res.redirect("/public-pages/"+clickedEntry);
    }else{
        //place holder response to keep page from waiting for a response
       res.status(200);
    }
}));

module.exports=router;