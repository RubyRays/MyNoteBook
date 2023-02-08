const express = require('express');
const router = express.Router();
const {isLoggedIn} = require('../middleware/login_middlewaare');
const catchAsync = require('../middleware/catchAsync');


router.get("/", isLoggedIn, catchAsync(async(req,res)=>{
    res.render("cancel");
}));

module.exports = router;