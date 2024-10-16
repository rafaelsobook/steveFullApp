// Get the dropdown button and content
const dropdownBtn = document.getElementById("dropdownBtn");
const dropdownContent = document.getElementById("dropdownContent");

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

    availableAvatars.forEach(avatar => {
        const aTag = document.createElement("div")
        
        aTag.innerHTML = avatar.avatarName
        dropdownContent.append(aTag)
    })
    // Close the dropdown if clicked outside of it
    window.onclick = function(event) {
        if (!event.target.matches('.dropdown-btn')) {
            if (dropdownContent.classList.contains("show")) {
                dropdownContent.classList.remove("show");
            }
            const avatarName = event.target.innerHTML
            if(!avatarName) return 
            const avatar = availableAvatars.find(avatar => avatar.avatarName === avatarName)
            if(!avatar) return

            avatarSelected(avatar)
        }
    };
    avatarSelected(availableAvatars[1])
}

function avatarSelected(avatarDet){
    selectedAvatar = {...avatarDet, name: `samplename${Math.random().toLocaleString().split(".")[1]}` }
    dropdownBtn.innerHTML = selectedAvatar.avatarName
}