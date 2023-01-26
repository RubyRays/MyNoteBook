const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const Review = require("../models/Review");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');



//--------------------Public page------------------------------------
router.get("/",isLoggedIn,level1Access, async(req,res)=>{

        
        // finding the document of the current user for the purpos of getting the url
        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                

                //finding the user related entries by the id of currently logged in user
                Note.find({"shared": {$eq: "true"}, "deleted":{$ne: "true"}}, function(err, publicPosts){

                    if(err){
                        console.log(err);
                        
                                
                    }else{

                            const pic= findpic.profileImage.url;                
                            res.render("publicPage", {pic, publicPosts: publicPosts});
                        
                    }
                });
            }});
 
});


//----------------Creating multiple new pages for the public page
//creating a page to show the entries of users
router.get("/:id", isLoggedIn, async(req,res)=>{
    
    
    //gets the title of the page that is going to be
    //created after the click --create page
    const pageEntry = req.params.id;
    const currentUser = req.user.username;

    console.log(currentUser)


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
                                        //renders the publicContent page
                                        //the data passed into it is the title of the page that the user is looking for
                                        //also the contents of the relavant noteBookContents of the found post     
                                        res.render("publicContent",{pic,newPublicContent:newPublicContent, pageEntry: pageEntry, currentUser: currentUser});

                                        })    
                                        
                                        });                        
                                    }

                            })
                             }});
                        }
                    }
                })
            

})

//--reviews section of public page
router.put("/:id/review",isLoggedIn,level2Access, async(req, res)=>{
    const id= req.params.id;
    console.log("EQWEQWE: "+ id);
    const pageEntry = id;
    const content=req.body.content;
     console.log("afadfa");

             
    if(req.body != null){

    const review = new Review({
        content: content,
        target:pageEntry,
        author: req.user.username 
    });
    review.save();
}

        res.redirect("/public-pages/"+pageEntry);


})

router.delete("/:id/review/:target/delete",isLoggedIn,level2Access, async(req, res)=>{
    const id= req.params.id;
    const target= req.params.target;    
    const clickedEntry = id;
        console.log(target);
        Review.deleteOne({target:target, author:{$eq:req.user.username}}, function(err, found){
            if(err){
                console.log(err);
                console.log("hey");
            }else{
                if(found)
                console.log(found)
                console.log("hello");
                //redirects to the page where the target of the review is
                 res.redirect("/public-pages/"+clickedEntry);

            }
        });
   

})

module.exports=router;