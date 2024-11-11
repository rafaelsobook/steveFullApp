const https = require('https');
const http = require("http")
const fs = require('fs')
const path = require("path")
const express = require("express")
const app = express()
const config = require('./config')
const { Server } = require("socket.io")

const PORT = process.env.PORT || config.port
const log = console.log
const { generateUUID, createRandomID} = require("./tools.js");


// HTTPS options (loading the SSL certificate and key)
let httpsOptions = {}

// Define paths for the key and cert files
const keyPath = path.join(__dirname, 'localhost-selfsigned.key')
const certPath = path.join(__dirname, 'localhost-selfsigned.crt')

// Check if both files exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    };
} else {
    log('Key or certificate file not found, setting httpsOptions to an empty object.')
}

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
            _id: `box${createRandomID()}`,
            type: "primitive",
            shape: "ground",
            shapeOpt: {width:10, height: 10},
            materialInfo: { texture: "images/tex.png", uAndVScale: 12},
            pos: {x:0,y:0,z:0},
            scale: {x:10,y:10,z:10},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:0,z:0, w: 0},
            physicsInfo: {enabled: true, physicsType: "box", mass: 0},
            modelName: "ground",
            isVisible: true,
            hasGizmos: false,
            parentMeshId: undefined
        },
        {
            _id: `box${createRandomID()}`,
            type: "primitive",
            shape: "box",
            shapeOpt: { size: 1},
            materialInfo: false,
            pos: {x:1.5,y:5,z:8},
            scale: {x:1,y:2,z:3},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:0,z:0, w: 0},
            physicsInfo: {enabled: true, physicsType: "box", mass: 0},
            modelName: "box",
            isVisible: true,
            hasGizmos: true,
            parentMeshId: undefined
        },
        {
            _id: `cylinder${createRandomID()}`,
            type: "primitive",
            shape: "cylinder",
            shapeOpt: { diameter: 2 },
            materialInfo: false,
            pos: {x:-2,y:0,z:-1},
            scale: {x:1,y:1,z:1},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:0,z:0, w: 0},
            physicsInfo: {enabled: true, physicsType: "cylinder", mass: 0},
            modelName: "cylinder",
            isVisible: true,
            hasGizmos: true,
            parentMeshId: undefined
        },
       {
            _id: `sword${createRandomID()}`,
            type: "remoteurl",
            url: "./models/sword.glb",
            materialInfo: false,
            pos: {x:2,y:1,z:4},
            scale: {x:1,y:1,z:1},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:0,z:0, w: 0},
            physicsInfo: {enabled: true, physicsType: "mesh", mass: 0},
            modelName: "sword",
            isVisible: true,
            hasGizmos: true,
            parentMeshId: undefined
       },
       {
            _id: `cave${createRandomID()}`,
            type: "remoteurl",
            url: "./models/cave.glb",
            materialInfo: false,
            pos: {x:0,y:0,z:-5},
            scale: {x:1,y:1,z:1},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:0.7071,z:0, w: 0.7071},
            physicsInfo: {enabled: true, physicsType: "mesh", mass: 0},
            modelName: "cave",
            isVisible: true,
            hasGizmos: true,
            parentMeshId: undefined
        },
        {
            _id: `cave${createRandomID()}`,
            type: "remoteurl",
            url: "./models/stair.glb",
            materialInfo: false,
            pos: {x:0,y:0,z:5},
            scale: {x:1,y:1,z:1},
            dir: {x:0,y:0,z:0},
            rotQ: {x:0,y:1,z:0, w:6.1232e-17},
            physicsInfo: {enabled: true, physicsType: "mesh", mass: 0},
            modelName: "stair",
            isVisible: true,
            hasGizmos: true,
            parentMeshId: undefined
        },
    //     {
    //         _id: "12asdf4",
    //         type: "hlsurl",
    //         url: "https://stream-fastly.castr.com/5b9352dbda7b8c769937e459/live_2361c920455111ea85db6911fe397b9e/index.fmp4.m3u8",
    //         pos: {x:4,y:1,z:4},
    //         scale: {x:5,y:5,z:5},
    //         dir: {x:0,y:0,z:0},
    //     }

        // {
        //     _id: "1235214",
        //     type: "remoteurl",
        //     url: "https://models.readyplayer.me/647fbcb1866a701f8317856c.glb",
        //     pos: {x:1,y:0,z:0},
        //      scale: {x:1,y:1,z:1},
        //     dir: {x:0,y:0,z:0},
        // },

    ]
})
rooms.set(2, {
    limit: 4,
    players: [],
    sceneDescription: [
    {
        _id: "1283820",
        type: "remoteurl",
        url: "./models/vwm.glb",
        pos: {x:0,y:2,z:0},
        scale: {x:1,y:1,z:1},
        dir: {x:0,y:0,z:0},
    }]
})
rooms.set(3, {
    limit: 4,
    players: [],
    sceneDescription: [
        // {
        //     _id: "342421",
        //     type: "equipment",
        //     url: "./models/sword.glb",
        //     pos: {x:0,y:1,z:0},
        //      scale: {x:1,y:1,z:1},
        //     dir: {x:0,y:0,z:0},
        //     isVisible: true,
        //     parentMeshId: false
        // }
    ]
})

// app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"))
//app.use('/multiplayer/node_modules', express.static(path.join(__dirname, 'node_modules')));
//
//app.get('/', (req, res) => {
//  res.redirect('/google');
//});

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
            roomNum: roomNum,
            controller: undefined, //key//joystick//vr//teleport
            currentSpd: 1.3,

            equipment: [
                {
                    id: generateUUID(),
                    name: 'gun',
                    type: 'equipment',
                    model_url: './models/gun.glb',
                    materialInfo: false,
                //   thumbnail_url: './image/${modelnName}.png', // could be generated with blender
                    offset: {
                        parent : "wrist",// Same between left and right?
                        position: {x: -0.02, y: -0.03, z:-0.08}, // relative to wrist
                        scaling: .11, // uniform
                        rotation: {x: 0.3118619785970446,y: -0.517518584933339, z: 0.6331840797317805, w: 0.48372982307105} // quaterion
                    },
                    actions: [
                      {
                        name: 'trigger-bullet',
                        trigger: 'distance(${IndexTip.postion}, ${wrist.position}) <= 0.09',        
                        respawn_offset: { x:-2.5, y:.5,z: 0 },
                        target_offset: {x:-15.5, y:.5, z:0},
                        pos : "${respawn_offset} transformed ${equipment.pos}",
                        dir : "${pos} - ${target_offset}",
                        emit: { pos: {}, dir: {}, roomNum: {} },
                        resulting_action: {
                            model: {meshType: "sphere", diameter: .1},
                            mass: .5,
                            force: 10,        
                            // starting pos: <from message>, dir: <from message>,        
                            // timeout: {1500, "${equipment.state.isReloading}=true" -> "${equipment.state.isReloading}=false"}
                            collisioncallback: {
                                // type: COLLISION_STARTED,
                                action: 'console.log("${hitmesh.name")'
                            }
                        }
                      }
                    ]
                },
                {
                    id: generateUUID(),
                    name: 'sword',
                    type: 'equipment',
                    model_url: './models/sword.glb',
                    materialInfo: { diffuse: "./textures/sword/sword.jpg", normal: "./textures/sword/swordnormal.jpg", normal: "./textures/sword/swordnormal.jpg", rough: "./textures/sword/swordrough.jpg"},
                //   thumbnail_url: './image/${modelnName}.png', // could be generated with blender
                    offset: {
                        parent :"wrist",// Same between left and right?
                        parentMeshId: "myDetail._id",
                        position: {x: -0.02, y: -0.03, z:-0.08}, // relative to wrist
                        scaling: .11, // uniform
                        rotation: {x: 0.3118619785970446,y: -0.517518584933339, z: 0.6331840797317805, w: 0.48372982307105} // quaterion
                    },
                    actions: [                            
                      {                                   
                        name: 'trigger-bullet',
                        trigger: 'distance(${IndexTip.postion}, ${wrist.position}) <= 0.09',        
                        respawn_offset: { x:-2.5, y:.5,z: 0 },
                        target_offset: {x:-15.5, y:.5, z:0},
                        pos : "${respawn_offset} transformed ${equipment.pos}",
                        dir : "${pos} - ${target_offset}",
                        emit: { pos: {}, dir: {}, roomNum: {} },
                        resulting_action: {
                            model: {meshType: "sphere", diameter: .1},
                            mass: .5,
                            force: 10,        
                            // starting pos: <from message>, dir: <from message>,        
                            // timeout: {1500, "${equipment.state.isReloading}=true" -> "${equipment.state.isReloading}=false"}
                            collisioncallback: {
                                // type: COLLISION_STARTED,
                                action: 'console.log("${hitmesh.name")'
                            }
                        }
                      }
                  ]
                },
            ]
        }
        socket.join(roomNum)
        room.players.push(playerDetail)

        io.to(roomNum).emit("player-joined", {
            newPlayer: data,
            allPlayers: rooms.get(roomNum).players,
            sceneDescription: rooms.get(roomNum).sceneDescription,
        })
        socket.emit("who-am-i", playerDetail)
        setTimeout(() => {
            socket.emit("scene-updated", rooms.get(roomNum).sceneDescription)
        }, 2000)
        log(`${data.name} has joined room ${roomNum}`)
        // socket.emit('player', playerDetail)
        // io.emit('players-details', players)
    })
    socket.on("create-something", data => {

        const {roomNum, entityType,materialInfo, entityUrl, entityId, parentMeshId, modelName} = data
        const room = rooms.get(roomNum)
        if(!room) return log('room not found')
        const entity = room.sceneDescription.find(entity => entity._id === entityId)
        if(entity) return log("entity already made")
        room.sceneDescription.push({
            _id: entityId,
            type: entityType,// "equipment",
            url:  entityUrl, //"./models/sword.glb",
            materialInfo,
            pos: {x:-0.02, y:-0.03, z:-0.08},
            scale: {x:.11,y:.11,z:.11},
            dir: {x:0,y:0,z:0},
            isVisible: true,
            parentMeshId,
            modelName
        })
        io.to(roomNum).emit("scene-updated", room.sceneDescription)
    })
    socket.on("toggle-visibility", data => {
   
        const {roomNum,entityId} = data
        const room = rooms.get(roomNum)
        if(!room) return log('room not found')
        const entity = room.sceneDescription.find(entity => entity._id === entityId)
        if(entity) {
            entity.isVisible = !entity.isVisible
            io.to(roomNum).emit("toggle-visibility", room.sceneDescription)
        }
    })
    socket.on("moved-object", data => {
        const room = rooms.get(data.roomNum)
        if(!room) return log("moving object from invalid room")
        const objectMoved = room.sceneDescription.find(mesh => mesh._id === data._id)
        if(!objectMoved) return log("object moved or rotated not found")

        objectMoved.pos = data.pos

        io.to(data.roomNum).emit("moved-object", room.sceneDescription)
    })
    socket.on("trigger-bullet", data => {
        // const {roomNum, pos, dir } = data
        io.to(data.roomNum).emit("trigger-bullet", data)
    })
    // movements
    let fps = 20
    let spd = .3 / fps
    socket.on("emit-move", data => {
       const { wristPos } = data
        for (const [key, value] of rooms) {
            let playerToMove = value.players.find(pl => pl._id === data._id)
            if (playerToMove) {

                playerToMove.dir = data.direction
                playerToMove.movement = data.movement
                playerToMove.quat = data.quat
                playerToMove.controller = data.controllerType
                playerToMove.camPosInWorld = data.camPosInWorld
                playerToMove._moving = true
                // playerToMove.wristPos = wristPos

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
                
                playerToStop._moving = false
                io.to(key).emit("player-stopped", playerToStop)
            }
        }
    })
    socket.on('emit-action', data => {
        const { actionName, _id } = data
        log(data)
        for (const [key, value] of rooms) {
            log(key)
            log(value.players)
            let playerEmittingAction = value.players.find(pl => pl._id === _id)
    
            if (playerEmittingAction) {
                log(actionName)
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
            }else log("player emit action not found")
        }
    })

    // vr
    socket.on("moving-hands", data => {
        const { wristPos, wristQuat, headDirection, camQuat, fingerCoord } = data
      
        for (const [key, value] of rooms) {
            let playerToMove = value.players.find(pl => pl._id === data._id)
            if (playerToMove) {
                playerToMove.wristPos = wristPos
                playerToMove.wristQuat = wristQuat
                playerToMove.headDirection = headDirection
                playerToMove.fingerCoord = fingerCoord
                io.to(key).emit("player-moved-hands", value.players)
            }
        }
    })
    socket.on("hide-or-show-hands", data => {
       
        for (const [key, value] of rooms) {
            let player = value.players.find(pl => pl._id === data._id)
            if (player) {
                player.vrHandsVisible = data.isVisible
                io.to(key).emit("hide-or-show-hands", value.players)
            }
        }
    })
    socket.on('disconnect', () => {
        for (const [key, value] of rooms) {
            const disconnectedPlayer = value.players.find(pl => pl.socketId === socket.id)
            if (disconnectedPlayer) {
                log(`${disconnectedPlayer.name} is disconnected`)
                value.players = value.players.filter(pl => pl.socketId !== disconnectedPlayer.socketId)
                value.sceneDescription = value.sceneDescription.filter(model => model.parentMeshId !== disconnectedPlayer._id)
                io.to(key).emit("player-dispose", disconnectedPlayer)
            }
        }
        console.log(socket.id)
    })

    //  debugger
    socket.on('display-debug', data => {
        log(data)
    })

    // Video and Audio
    socket.on("join", function (roomName) {
        let rooms2 = io.sockets.adapter.rooms;
        let room = rooms2.get(roomName);

        //room == undefined when no such room exists.
        if (room == undefined) {
          socket.join(roomName);
          socket.emit("created");
        } else if (room.size == 1) {
          //room.size == 1 when one person is inside the room.
          socket.join(roomName);
          socket.emit("joined");
        } else {
          //when there are already two people inside the room.
          socket.emit("full");
        }
        console.log(rooms);
    });

    //Triggered when the person who joined the room is ready to communicate.
    socket.on("ready", function (roomName) {
        socket.broadcast.to(roomName).emit("ready"); //Informs the other peer in the room.
    });

    //Triggered when server gets an icecandidate from a peer in the room.

    socket.on("candidate", function (candidate, roomName) {
        console.log(candidate);
        socket.broadcast.to(roomName).emit("candidate", candidate); //Sends Candidate to the other peer in the room.
    });

    //Triggered when server gets an offer from a peer in the room.

    socket.on("offer", function (offer, roomName) {
        socket.broadcast.to(roomName).emit("offer", offer); //Sends Offer to the other peer in the room.
    });

    //Triggered when server gets an answer from a peer in the room.

    socket.on("answer", function (answer, roomName) {
        socket.broadcast.to(roomName).emit("answer", answer); //Sends Answer to the other peer in the room.
    });

    //Triggered when peer leaves the room.

    socket.on("leave", function (roomName) {
        socket.leave(roomName);
        socket.broadcast.to(roomName).emit("leave");
    });
})
app.get('/event/:roomid/', (req, res) => {
    const url = req.query.url
    const roomid = req.params.roomid
    log(url,roomid)
    res.json({roomid,url}).status(200)
    io.to(parseInt(roomid)).emit("scene-updated", {roomid, url})
})

server.listen(PORT, () => log("TCP server is on ", PORT))
