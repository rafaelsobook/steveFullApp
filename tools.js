const fs = require("fs");
const path = require("path");
const util = require('util');
const readFile = util.promisify(fs.readFile);
const log = console.log

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function createRandomID(){
    return Math.random().toLocaleString().split(".")[1] //
}
function createRandomNum(_maxNumber){
    return Math.floor(Math.random()*(_maxNumber+1))
}
function createPlayerDetail(data, socketId){
    const {name, roomNumber, avatarUrl } = data
    return {
        _id: generateUUID(),
        name: name,
        socketId,
        loc: {
            x: -2 + Math.random() * 3,
            y: 1, // height of a box is 2 half of it is 1
            z: 0,//-2 + Math.random()*3
        },
        movement: {
            moveX: 0,
            moveZ: 0
        },
        dir: {
            x: 0,
            y: 0,
            z: 0 // facing forward
        },
        // for VR hands and head
        vrHandsVisible: false,
        quat: undefined,
        wristPos: false,
        wristQuat: false,
        headDirection: false,
        // {
        //     left: { x: 0, y:0, z: 0, w: 1 },
        //     right: { x: 0, y:0, z: 0, w: 1 }
        // },
        _actionName: undefined,
        _moving: false,
        avatarUrl,
        roomNum:roomNumber,
        controller: undefined, //key//joystick//vr//teleport
        currentSpd: 1.3
    }
}
async function loadEquipment(number) {
    try {
        const jsonString = await readFile(path.join(__dirname, "inventory.json"), 'utf8');
        const data = JSON.parse(jsonString);
        const item = data[number];
        item.id = generateUUID()
        return [item]
    } catch (err) {
        console.log(err);
    }
}
module.exports = { generateUUID, createRandomID, createPlayerDetail, loadEquipment,createRandomNum }