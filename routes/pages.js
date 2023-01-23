const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const https = require("https");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access, level2Access}= require('../middleware/access_middleware');
const data = require("../data");

//-------------------MAIN PAGE FOR USER NOTES--------------------
router.get("/", isLoggedIn, async(req,res)=>{


        const theUser = req.user.username;


        //finds the current user using the user.id provided by the passport package
        NoteUser.findById(req.user.id,function(err, foundUser) {
            if(err){
                console.log(err);
            }else{

                if(foundUser){

                    //looking for the data in the notes collection where the owner name
                    //is the same as the username of the currently logged in user
                    Note.find({"owner": req.user.username, "deleted":{$ne:"true"}}, function(err, user2) {

                        const pic= foundUser.profileImage.url;
                                            
                        //saves the notes associated with the user into the notebooks array
                        foundUser.noteBookContents=user2;

                        //saves the userinfo into noteUser collection and renders the page
                        foundUser.save(function(){

                            res.render("page", {pic, messages: req.flash('success'), userContent: foundUser, theUser: theUser});
                                
                        })
                    })
                }
            }
        });
  

});

//renders the notebook user page
router.post("/",isLoggedIn, async(req,res)=>{
    
//API SECTION WHERE DATA IS PASSED FROM ONE API TO BE USED IN THE OTHER BY MEANS OF 
//CALLBACK FUNCTIONS  
    //USING AN IP ADDRESS FINDER TO GET THE CITY NAME OF THE USER
    token=process.env.IPINFO_TOKEN;
    const ipinfoApi ="https://ipinfo.io?token="+token;

    function makeCall (ipinfoApi, callback){

        https.get(ipinfoApi, function(response){

            // console.log(response.statusCode);
            response.on("data", function(data){

                const ipData= JSON.parse(data);
                const city = ipData.city;
                callback(city);
                
            })
        })
}
    function handleResults(results){
        const query= results;
        const apiKey = process.env.WEATHER_API_KEY;
        const unit= "metric"
        //api url for the weather api
        const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q="+query+"&appid="+apiKey+"&units="+unit;

        function makeCall2(weatherUrl, callback){

            https.get(weatherUrl, function(response){
                response.on("data", function(data){
                    //converts data to json
                    const weatherData = JSON.parse(data);
                    const icon = weatherData.weather[0].icon;
                    const imageURL = "http://openweathermap.org/img/wn/"+icon+"@2x.png";
                    callback(imageURL);
                })
            })
        }

        //THE RESULTS OF "makeCall2"
        //SENDS THE WEATHER INFO USING "results2"
        function handleResults2(results2){
            let date=data.getDay();
            let time= data.getTime();
            if(req.body != null){
                //creates a new post
                const post=new Note({
                    title: req.body.title,
                    content: req.body.content,
                    owner: req.user.username,
                    state: "normal-mode",
                    date: date,
                    time: time,
                    imageURL: results2,
                    shared: "false",


                });
            
                //saving the information entered into the note document 
                post.save();
            }

            res.redirect("/pages");

        }
        makeCall2(weatherUrl, function(results2) {
            handleResults2(results2);
        })
        }
    makeCall(ipinfoApi, function(results) {
        
        handleResults(results);
    })

     


 }

);


//--------User page Buttons

//--eraser icon request--deletes the entry from the noteuser collection
//and marks it as deleted inside of the notes collection
router.put("/delete",isLoggedIn, async(req, res)=>{
    //distinguishing things to delete
    const clickedEntry = req.body.deleteEntry;

        Note.updateOne(
            {_id: clickedEntry},
            {$set: {"deleted": "true"}},
            function(err) {
                if(err) {
                    console.log(err);
                }
            }
            )
        //Finds the entry with the id of the currently logged in user
        //looks at the notebookContents array and finds the id inside that 
        //corresponds to the clickedEntry (the delete button that corresponds to the entry)
        //then it excludes it from the list after the update
        //this causes the items to be erased from the NoteUser collection.
        NoteUser.findOneAndUpdate({_id:req.user.id},
            {$pull:{noteBookContents:{_id: clickedEntry}}},
            {new:true, useFindAndModify: false},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    res.redirect("/pages");
                    
                }
            }
            );

})

//--pen icon request-used to hide and unhide the edit form
router.put("/pre-edit",isLoggedIn, async(req, res)=>{

    //gets information sent by the editEntry/pen button
    const editState = req.body.editEntry;
    console.log(editState);
    //find the state of the entry being clicked and toggle it between edit-mode and normal-mode
    Note.findById(editState, function(err, foundEntry){
        if(err){
            console.log(err);
        }else{
            if(foundEntry.state == "edit-mode"){
                Note.updateOne(
                    {_id: editState},
                    {$set: {"state": "normal-mode"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                           
                            res.redirect("/pages");
                        }
                    }        
                )                
            }else{
                Note.updateOne(
                    {_id: editState},
                    {$set: {"state": "edit-mode"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            
                            res.redirect("/pages");
                        }
                    }        
                )                
            }
        }
    })

})

 
//--edit button request- used to edit user entries
router.put("/edit",isLoggedIn, async(req,res)=> {
    const toEdit = req.body.Edit;
    const title= req.body.title2;
    const content=req.body.content2;

        //updates the title and content of the note
        Note.updateOne(
            {_id: toEdit},
            {$set: {"title":title, "content":content }},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("edit page button pressed");
                   
                }
            }
        );
        //updates the title and content of the noteUser
        NoteUser.updateOne(
        {_id: req.user.id, "noteBookContents":{"$elemMatch": {"_id": toEdit}}},
        {$set: {"noteBookContents.$.title":title, "noteBookContents.$.content":content }},
        function(err){
            if(err){
                console.log(err);
            }else{
                console.log("edit page button pressed");
                
            }
         }
    );
         //updates the state everytime the edit page button is clicked on
        Note.updateOne(
            {_id: toEdit},
            {$set: {"state": "normal-mode"}},
            function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("edit page button pressed");
                    res.redirect("/pages");
                }
            }        
        )
   

})

//--last icon (arrow in a box) request to share and unshare user entries
router.put("/share-unshare",isLoggedIn,level1Access, async(req, res)=> {
    const toShare= req.body.share;
    //finding the entry by its id
    Note.findById(toShare, function(err, foundNoteEntry) {
        if(err){
            console.log(err);
        }else{
            //checking the shared state
            //if the state is false when clicked change it to true
            //otherwise change it to false
            if(foundNoteEntry.shared === "false") {
                Note.updateOne(
                    {_id: toShare},
                    {$set: {"shared": "true"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/pages")
                        }
                    }
            ) 
            }else{
                Note.updateOne(
                    {_id:toShare},
                    {$set: {"shared": "false"}},
                    function(err){
                        if(err){
                            console.log(err);
                        }else{
                            res.redirect("/pages")
                        }
                    }
                )    
            }
        }
    })

})

//Go to page buttonn request
//---this creates multiple new pages for the users page
//creating a page to show the entries of users
router.get("/:id",isLoggedIn, async(req,res)=>{
    

        //gets the title of the page that is going to be
        //created after the click --create page
        const pageEntry = req.params.id;

        const theUser = req.user.username;

        NoteUser.findById(req.user.id, function(err, findpic){
            if(err){
                console.log(err);
            }else{
                
        //search for the record with the same username as the currently logged in user
        NoteUser.findOne({"username": theUser}).populate('noteBookContents').exec(function(err, post){
            if(err){
                console.log(err);
            }else{
                const newPage = post.noteBookContents;
                const pic= findpic.profileImage.url;
                //renders the userContent page
                //the data passed into it is the title of the page that the user is looking for
                //also the contents of the relavant noteBookContents of the found post     
                res.render("userContent",{pic,newPage:newPage, pageEntry: pageEntry});    

            }
        

        })
    }});


})



//--------------------------------------------------------

module.exports=router;