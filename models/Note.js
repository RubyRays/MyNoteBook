const mongoose = require('mongoose');
const {Schema} = mongoose;
const Review= require('./Review');

//notes document layout 
//built to contain the information of the entries created by a user
const notesSchema = new mongoose.Schema({
    title: String,
    content:String,
    owner: String,
    state: String,
    date: String,
    time: String,
    imageURL: String,
    shared: String,
    deleted: String,
    reviews: [{type: Schema.Types.ObjectId, ref:'Review'}]

});

const Note = mongoose.model("Note", notesSchema);

module.exports = Note;