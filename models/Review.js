const mongoose = require('mongoose');
const {Schema} = mongoose;




const reviewSchema = new mongoose.Schema({
    content: String, 
    likes: Number,
    dislikes: Number,
    author: String, 
    target: {type: String, default: "here"}
})

const Review = new mongoose.model("Review", reviewSchema);

module.exports = Review;