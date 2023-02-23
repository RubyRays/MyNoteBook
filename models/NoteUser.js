const mongoose = require('mongoose');
const {Schema} = mongoose;
const Note = require('./Note');
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');

//user document layout
const noteUserSchema =new mongoose.Schema({
    username: String,
    email: {type: String, unique: true},
    isVerified: {type: Boolean, default: false},
    verificationCode: String,
    password: String,
    noteBookContents: [{type: Schema.Types.ObjectId, ref:"Note"}],
    googleId: String,
    profileImage:{
        url: String,
        filename: String
    },
    accessType:{type:String, default:"default"},
    locationAccess: {type: String, default: "off"},
    theme: {type: String, default: "default"}

});

//passportLocalMongoose is used to hash and salt passport and save users to mongodb database
//adds to schema a username, password and make sure that the usernames are unique
//also adds some methods
noteUserSchema.plugin(passportLocalMongoose);
noteUserSchema.plugin(findOrCreate);


const NoteUser = new mongoose.model("NoteUser", noteUserSchema);

module.exports= NoteUser;

