// Get the dropdown button and content
const dropdownBtn = document.getElementById("dropdownBtn");
const dropdownContent = document.getElementById("dropdownContent");

const dropdownImmMode = document.getElementById("dropdownImmMode");
const dropdownImmModeContent = document.getElementById("dropdownImmModeContent");

let dropDownInitiated = false
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
let selectedAvatar = undefined

let availableImmMode = [
    "immersive-vr",
    "immersive-ar"
]

let selectedImmMode = "immersive-vr"

export function getSelectedImmMode(){
    return selectedImmMode
}
export function getInitialPlayer(){
    return selectedAvatar
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

            avatarSelected(avatar)
        }
        if (!event.target.matches('.dropdown-btn')) {
            if (dropdownContent.classList.contains("show")) {
                dropdownContent.classList.remove("show");
            }
            if (dropdownImmModeContent.classList.contains("show")) {
                dropdownImmModeContent.classList.remove("show");
            }
        }
        if (parentClassName.includes("immersive-opt")) {
            // if (dropdownImmMode.classList.contains("show")) {
            //     dropdownImmMode.classList.remove("show");
            // }
            const modeName = event.target.innerHTML
            selectedImmMode = modeName
            dropdownImmMode.innerHTML = modeName
        }
    };
    avatarSelected(availableAvatars[1])

    // selection immersive mode

}

function avatarSelected(avatarDet){
    selectedAvatar = {...avatarDet, name: `samplename${Math.random().toLocaleString().split(".")[1]}` }
    dropdownBtn.innerHTML = selectedAvatar.avatarName
}


