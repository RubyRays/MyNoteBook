const express = require('express');
const router = express.Router();
const {isLoggedIn} = require('../middleware/login_middlewaare');



router.get("/", isLoggedIn, async(req,res)=>{
    res.render("cancel");
})

module.exports = router;