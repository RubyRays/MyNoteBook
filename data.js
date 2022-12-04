

exports.getDay=function(){
    let postDate = new Date();
    let options ={
        weekday: "long",
        day: "2-digit",
        month: "long"
    };
    let day = postDate.toLocaleDateString("en-Us", options);
    return day;

}

exports.getTime = function(){
    let postTime = new Date();
    let options = {
        time: "numberic"
    }
    return postTime.toLocaleTimeString("en-Us", options);
}