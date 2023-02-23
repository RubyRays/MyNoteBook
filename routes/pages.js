const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteUser= require('../models/NoteUser');
const https = require("https");
const {isLoggedIn} = require('../middleware/login_middlewaare');
const {level1Access}= require('../middleware/access_middleware');
const data = require("../data");
const catchAsync = require('../middleware/catchAsync');


//-------------------MAIN PAGE FOR USER NOTES--------------------

//pages (main user page) route 
router.get("/", isLoggedIn, catchAsync(async(req,res)=>{

        //finds current user by username, save the associated entry to noteuser
        //finds the note of the user whose deleted field is not marked as true
        //stores the url of the profile image inside of pic 
        //stores the theme data inside of theme 
        //stores the url of the page inside of url
        //assigns the found note to the noteBook contents array then saves the noteuser entry
        //finally renders the page using the things found
        const theUser = req.user.username;
        const noteuser = await NoteUser.findById(req.user.id);
        const note = await Note.find({"owner":theUser, "deleted":{$ne:"true"}});
        const pic= noteuser.profileImage.url;
        const theme = noteuser.theme;
        const url = "pages";
        noteuser.noteBookContents= note;
        await noteuser.save();
        res.render('page',{pic,theme,url, messages: req.flash('success'), userContent: noteuser, theUser: theUser });




}));

//pages post request which saves the created note entry into the database
router.post("/",isLoggedIn, catchAsync(async(req,res)=>{

const noteuser = await NoteUser.findById(req.user.id);


//if the location access is on then the user location is used as a parameter for the weather app api 
//and the corresponding weather icon is saved
if(noteuser.locationAccess == "on" ){

    //API SECTION WHERE DATA IS PASSED FROM ONE API TO BE USED IN THE OTHER BY MEANS OF 
    //CALLBACK FUNCTIONS  
        //USING AN IP ADDRESS FINDER TO GET THE CITY NAME OF THE USER
        token=process.env.IPINFO_TOKEN;
        //api endpoint with the access token
        const ipinfoApi ="https://ipinfo.io?token="+token;

        //using the function call the api 
        function makeCall (ipinfoApi, callback){

            https.get(ipinfoApi, function(response){

                response.on("data", function(data){
                    const ipData= JSON.parse(data);
                    const city = ipData.city;
                    //sends city data
                    callback(city);
                    
                })
            })
    }
        function handleResults(results){
            //this stores the city data that was sent by the callback
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

        
    }else{
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
                imageURL: "/css/images/default-cloud.png",
                shared: "false",


             });
                
             //saving the information entered into the note document 
             post.save();
        }

        res.redirect("/pages");

    }

    }

));


//--------User page Buttons

//--eraser icon request--deletes the entry from the noteuser collection
//and marks it as deleted inside of the notes collection
router.put("/delete",isLoggedIn, catchAsync(async(req, res)=>{
    const clickedEntry = req.body.deleteEntry;
    await Note.updateOne({_id:clickedEntry}, {"deleted": "true"});
    // await NoteUser.findOneAndUpdate(req.user.id, {noteBookContents:{_id: clickedEntry}})
    res.redirect("/pages");


  

}));

//--pen icon request-used to hide and unhide the edit form
router.put("/pre-edit",isLoggedIn, catchAsync(async(req, res)=>{
    //gets information sent by the editEntry/pen button
    const editState = req.body.editEntry;

    // //find the state of the entry being clicked and toggle it between edit-mode and normal-mode
    const note = await Note.findById(editState);

    //updates the state of the note
    //used as a marker for entries in or not in the process of being edited
    if(note.state == "edit-mode"){
        await Note.updateOne({_id:editState},{"state":"normal-mode"});
    }else{
        await Note.updateOne({_id:editState},{"state": "edit-mode"});
    }
    res.redirect("/pages");

}));

 
//--edit button request- used to edit user entries
router.put("/edit",isLoggedIn, catchAsync(async(req,res)=> {
    const toEdit = req.body.Edit;
    const title= req.body.title2;
    const content=req.body.content2;
    //updates the title and content of the targeted note
    await Note.updateOne({_id: toEdit}, {"title": title, "content": content});
    //updates the state of the note to normal mode
    //used as a marker for entries no longer in the process of being edited
    await Note.updateOne({_id: toEdit}, {"state": "normal-mode"});
    res.redirect("/pages");







}));

//--last icon (arrow in a box) request to share and unshare user entries

router.put("/share-unshare",isLoggedIn,level1Access, catchAsync(async(req, res)=> {
    const toShare= req.body.share;
    //finding the entry by its id
    const note = await Note.findById(toShare);
    //updates shared field of current user to true if it is false
    //at the time of request otherwise it is set to false
    if(note.shared == "false"){
        await Note.updateOne(
                    {_id:toShare},
                    {"shared":"true"});
    }else{
        await Note.updateOne(
                    {_id:toShare},
                    {"shared":"false"});
    }
    res.redirect("/pages");



}));

//Go to page buttonn request
//---this creates multiple new pages for the users page
//creating a page to show the entries of users
router.get("/:id",isLoggedIn, catchAsync(async(req,res)=>{
        //gets the id of the page that is going to be
        //created after the click --create page
        const pageEntry = req.params.id;
        const theUser = req.user.username;
        const noteuser = await NoteUser.findById(req.user.id);
        const pic = noteuser.profileImage.url;
        const post= await NoteUser.findOne(
                        {"username": theUser})
                        .populate('noteBookContents'
                         );
        const newPage = post.noteBookContents;
        const theme = noteuser.theme;
        const url = "pages/"+pageEntry;
        res.render("userContent",{pic, theme, url, newPage:newPage, pageEntry: pageEntry}); 

 

}));



//--------------------------------------------------------

module.exports=router;