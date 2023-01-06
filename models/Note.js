const mongoose = require('mongoose');
const {Schema} = mongoose;
const reviews= require('./Review');


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
    reviews: [{type: Schema.Types.Mixed, ref:'reviews'}]

});

const Note = mongoose.model("Note", notesSchema);

module.exports = Note;