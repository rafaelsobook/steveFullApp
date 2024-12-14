const fs = require("fs");
const path = require("path");
const util = require('util');
const readFile = util.promisify(fs.readFile);
const { v4: uuidv4 } = require('uuid');
const log = console.log

function createRandomID(){
    return Math.random().toLocaleString().split(".")[1] //
}
function createRandomNum(_maxNumber){
    return Math.floor(Math.random()*(_maxNumber+1))
}
function createPlayerDetail(data, socketId){
    const { name, roomNumber, avatarUrl } = data
    const spawnPoint = {
        x: -2 + Math.random() * 3,
        y: 1, // height of a box is 2 half of it is 1
        z: 0,//-2 + Math.random()*3
    }
    return {
        _id: uuidv4(),
        name: name,
        socketId,
        loc: spawnPoint,
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
        // Validate input
        if (![0, 1, 2].includes(number)) {
            throw new Error('Invalid inventory number. Must be 0, 1, or 2');
        }
        
        const inventoryFile = `inventory${number}.json`;
        const jsonString = await readFile(path.join(__dirname, inventoryFile), 'utf8');
        const data = JSON.parse(jsonString);

        return data;
    } catch (err) {
        console.log(`Error loading inventory${number}.json:`, err);
        return []; // Return empty array on error
    }
}
module.exports = { createRandomID, createPlayerDetail, loadEquipment,createRandomNum }