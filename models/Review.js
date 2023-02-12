const mongoose = require('mongoose');
const {Schema} = mongoose;




const reviewSchema = new mongoose.Schema({
    content: String, 
    likes: {type: Number, default: 0},
    dislikes:{type: Number, default: 0},
    author: String, 
    target: {type: String, default: "here"},
    // if the user is in the commenter list then disable the likes and dislikes button 
    commenter:[{name: String, reaction:String}]
})

const Review = new mongoose.model("Review", reviewSchema);

module.exports = Review;