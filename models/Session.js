const mongoose = require('mongoose');
const {Schema} = mongoose;




const sessionSchema = new mongoose.Schema({
    sessions: String, 
    username: String, 
    item: String,
})

const Session = new mongoose.model("Session", sessionSchema);

module.exports = Session;