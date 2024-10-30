import { randomNumToStr } from "./creations.js";

// Get the dropdown button and content
const dropdownBtn = document.getElementById("dropdownBtn");
const dropdownContent = document.getElementById("dropdownContent");

const dropdownImmMode = document.getElementById("dropdownImmMode");
const dropdownImmModeContent = document.getElementById("dropdownImmModeContent");

let dropDownInitiated = false

// we have two dropdown element because we have two buttons and two dropdwon element can be displayed in the view at the same time
// list of available character options on the dropdown menu // this is the list we will see once select avatar btn is pressed
let availableAvatars = [
    {
        avatarName: "rafael",
        avatarUrl: "https://models.readyplayer.me/66be713b3f3b5915e2df2b32.glb"
    },
    {
        avatarName: "steve long hair",
        avatarUrl: "https://models.readyplayer.me/6680878cab338d43c845e3eb.glb"
    },    
    {
        avatarName: "steve purple",
        avatarUrl: "https://models.readyplayer.me/647fbcb1866a701f8317856c.glb"
    },
    {
        avatarName: "Belle",
        avatarUrl: "https://models.readyplayer.me/661ddfc815d99b54c430940b.glb"
    },
    {
        avatarName: "Jordan",
        avatarUrl: "https://models.readyplayer.me/66f473f48789cc73f5a0a972.glb"
    }
//    {
//        avatarName: "Kyle",
//        avatarUrl: "./models/kyle.glb"
//    },
//    {
//        avatarName: "Sehu",
//        avatarUrl: "./models/sehu.glb"
//    }
]
// list of available immersive option on the dropdown menu // this is the list we will see once select immersive option btn is pressed
let availableImmMode = [
    "Immersive VR",
    "Immersive AR"
]

let selectedAvatar = {...availableAvatars[2], name: `name${randomNumToStr()}`} // steve purple by default
let selectedImmMode = "Immersive VR" // immersive vr by default

updateButtonsInnerHTML()// only for updating Buttons innerHTML UI nothing else


// this function will be used in sockets, we will call this function in the socketLogic to inform the server about our selected avatar, so when it returns to the client it will create the 3d model that we select from the start by default it is set to steve purple
export function getInitialPlayer(){
    return selectedAvatar
}
// this function will be used when you go immersive it will then go VR or AR according to what you have chosen, default is immersive VR
export function getSelectedImmMode(){
    return selectedImmMode
}

export function initDropDown(){
    if(dropDownInitiated) return

    // Toggle the dropdown visibility when the button is clicked
    dropdownBtn.addEventListener("click", function() {
        dropdownContent.classList.toggle("show");
    });
    dropdownContent.innerHTML =''
    
    dropdownImmMode.addEventListener("click", function() {
        dropdownImmModeContent.classList.toggle("show");
    });
    dropdownImmModeContent.innerHTML =''

    availableAvatars.forEach(avatar => {
        const aTag = document.createElement("div")
        
        aTag.innerHTML = avatar.avatarName
        dropdownContent.append(aTag)
    })
    availableImmMode.forEach(immMode => {
        const aTag = document.createElement("div")
        
        aTag.innerHTML = immMode
        dropdownImmModeContent.append(aTag)
    })
    // Close the dropdown if clicked outside of it
    window.onclick = function(event) {
        const parentClassName = event.target.parentElement.className
        if(!parentClassName) return
        if(parentClassName.includes("character-opt")){
            const avatarName = event.target.innerHTML
            if(!avatarName) return 
            const avatar = availableAvatars.find(avatar => avatar.avatarName === avatarName)
            if(!avatar) return
            selectedAvatar = avatar
        }
        if (parentClassName.includes("immersive-opt")) selectedImmMode = event.target.innerHTML
        
        if (!event.target.matches('.dropdown-btn')) {
            if (dropdownContent.classList.contains("show")) {
                dropdownContent.classList.remove("show");
            }
            if (dropdownImmModeContent.classList.contains("show")) {
                dropdownImmModeContent.classList.remove("show");
            }
        }

        // updating the buttons innerHTML value according to chosen avatar or immersive option
        updateButtonsInnerHTML()
    };
}


// only for updating Buttons innerHTML UI nothing else
function updateButtonsInnerHTML(){
    dropdownBtn.innerHTML = selectedAvatar.avatarName
    dropdownImmMode.innerHTML = selectedImmMode
}
