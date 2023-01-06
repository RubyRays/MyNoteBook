const mongoose = require('mongoose');
const {Schema} = mongoose;
const Note = require('./Note');
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');

const noteUserSchema =new mongoose.Schema({
    username: String,
    email: {type: String, unique: true},
    isVerified: {type: Boolean, default: false},
    verificationCode: String,
    password: String,
    noteBookContents: [{type: Schema.Types.Mixed, ref:"Note"}],
    googleId: String,
    profileImage:{
        url: String,
        filename: String
    }

});
noteUserSchema.plugin(passportLocalMongoose);
noteUserSchema.plugin(findOrCreate);


const NoteUser = new mongoose.model("NoteUser", noteUserSchema);

module.exports= NoteUser;

