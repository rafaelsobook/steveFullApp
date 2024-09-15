const https = require('https');
const http = require("http")
const fs = require('fs')
const path = require("path")
const express = require("express")
const app = express()

const { Server } = require("socket.io")

const PORT = process.env.PORT || 5173
const log = console.log
const { generateUUID } = require("./tools.js")

// HTTPS options (loading the SSL certificate and key)
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-selfsigned.key')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost-selfsigned.crt')),
};

let isHttps = false
let server
if (isHttps) {
    server = https.createServer(httpsOptions, app)
} else {
    server = http.createServer(app)
}

const rooms = new Map()
rooms.set(1, {
    limit: 4,
    players: [],
    sceneDescription: [
        {
            _id: "1235214",
            type: "remoteurl",
            url: "https://models.readyplayer.me/647fbcb1866a701f8317856c.glb",
            pos: {x:1,y:0,z:0},
            dir: {x:0,y:0,z:0},
        },
        {
            _id: "123",
            type: "primitive",
            shape: "box",
            pos: {x:1.5,y:0,z:2},
            dir: {x:0,y:0,z:0},
        },
        {
            _id: "d1231x",
            type: "primitive",
            shape: "cylinder",
            pos: {x:-2,y:0,z:-1},
            dir: {x:0,y:0,z:0},
        },
    ]
})
rooms.set(2, {
    limit: 4,
    players: [],
    sceneDescription: []
})

// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"))
const router = express.Router();


let io = new Server(server, {
    cors: {
        origin: [
            "/",
        ],
        methods: ["GET", "POST"]
    }
})

io.on("connection", socket => {
    
    _socket = socket
    socket.emit("room-size", rooms.size)

    socket.on('joinRoom', data => {
        const {name, roomNumber, avatarUrl } = data
        const roomNum = parseInt(roomNumber)
        const room = rooms.get(roomNum)
        if (!room) return console.log(84, 'room number not found')
        if (room.limit <= room.players.length) return log(48, "players full")

        const playerDetail = {
            _id: generateUUID(),
            name: name,
            socketId: socket.id,
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
            _actionName: undefined,
            _moving: false,
            avatarUrl,
            roomNum: roomNum,
            controllerType: undefined, //key//joystick//vrstick//teleport
            currentSpd: 1.3,
        }
        socket.join(roomNum)
        room.players.push(playerDetail)

        io.to(roomNum).emit("player-joined", {
            newPlayer: data,
            allPlayers: rooms.get(roomNum).players,            
        })
        socket.emit("who-am-i", playerDetail)
        setTimeout(() => {
            socket.emit("scene-updated", rooms.get(roomNum).sceneDescription)
        }, 2000)
        log(`${data.name} has joined room ${roomNum}`)
        // socket.emit('player', playerDetail)
        // io.emit('players-details', players)
    })

    // movements 
    let fps = 20
    let spd = .3 / fps
    socket.on("emit-move", data => {
       
        for (const [key, value] of rooms) {
            let playerToMove = value.players.find(pl => pl._id === data._id)
            if (playerToMove) {
                log(data.movement)
                playerToMove.dir = data.direction
                playerToMove.movement = data.movement

                io.to(key).emit("a-player-moved", value.players)
            }
        }
    })
    socket.on("emit-stopped", data => {
        for (const [key, value] of rooms) {
            let playerToStop = value.players.find(pl => pl._id === data._id)
            if (playerToStop) {
                playerToStop.dir = data.direction
                playerToStop.movement = data.movement
                playerToStop.loc = data.loc
                io.to(key).emit("player-stopped", playerToStop)
            }
        }
    })
    socket.on('emit-action', data => {
        const { actionName, _id } = data
        // log(actionName)
        for (const [key, value] of rooms) {
            let playerEmittingAction = value.players.find(pl => pl._id === _id)
            if (!playerEmittingAction) return
            if (playerEmittingAction) {
                if (playerEmittingAction._actionName === actionName) return log('still on ', actionName)
                switch (actionName) {
                    case "jump":

                        break
                }
                playerEmittingAction._actionName = actionName
                io.to(key).emit("player-emitted-action", data)
                setTimeout(() => {
                    playerEmittingAction._actionName = undefined
                    io.to(key).emit("remove-action", data)
                }, 1000)
            }
        }
    })
    // setInterval(() => {
    //     for (const [key, value] of rooms) {
    //         if (!value.players.length) return

    //         io.to(key).emit("a-player-moved", value.players)
    //     }
    // }, 1000 / fps)

    socket.on('disconnect', () => {
        for (const [key, value] of rooms) {
            const disconnectedPlayer = value.players.find(pl => pl.socketId === socket.id)
            if (disconnectedPlayer) {
                log(`${disconnectedPlayer.name} is disconnected`)
                value.players = value.players.filter(pl => pl.socketId !== disconnectedPlayer.socketId)
                io.to(key).emit("player-dispose", disconnectedPlayer)
            }
        }
        console.log(socket.id)
    })
})
app.get('/event/:roomid/', (req, res) => {
    const url = req.query.url
    const roomid = req.params.roomid
    log(url,roomid)
    res.json({roomid,url}).status(200)
    io.to(parseInt(roomid)).emit("scene-updated", {roomid, url})
})

server.listen(PORT, () => log("TCP server is on ", PORT))