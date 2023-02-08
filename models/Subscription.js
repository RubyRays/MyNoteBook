const mongoose = require('mongoose');
const {Schema} = mongoose;

const subscriptionSchema = new mongoose.Schema ({
    price: Number,
    type: String,
    imageUrl: String,
    priceId: String,
    benefits:[String]
})

const Subscription = new mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;