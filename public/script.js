const button = document.querySelector('button')
button.addEventListener("click", ()=>{
    fetch('/check-out', {
        method:'Post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            itemed:
                {id:1, quantity: 3},
                
            
        }),
    })
        .then(res =>{
            //if there is a failure then sends it to a promise reject
            if (res.ok) return res.json()
            return res.json().then(json => Promise.reject(json))
        }).then(({url})=>{
            // console.log(url);
            window.location = url
        }).catch(e => {
            //sends an error from server if there is an error
            console.error(e.error)
        })
    })

