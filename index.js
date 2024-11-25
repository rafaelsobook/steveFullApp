const https = require('https');
const http = require("http")
const fs = require('fs')
const path = require("path")
const express = require("express")
const app = express()
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const config = require('./config')
const { Server } = require("socket.io")
const {login, loadUsers, hashPassword, saveChanges} = require("./login.js")

const PORT = process.env.PORT || config.port
const log = console.log
const { generateUUID, createRandomID} = require("./tools.js");
const {getRoom, saveChangeDescription} = require("./room.js")
const { ok } = require('assert');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))
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
    }
} else {
    log('Key or certificate file not found, setting httpsOptions to an empty object.')
}

let isHttps = config.isHttps
let server
if (isHttps) {
    server = https.createServer(httpsOptions, app)
} else {
    server = http.createServer(app)
}

const AUTH_FILE_PATH = path.join(__dirname, 'auth-tokens.json');

// Initialize the Map
const authTokenToUser = new Map();

// Load auth tokens from file
async function loadAuthTokens() {
    try {
        const data = fs.readFileSync(AUTH_FILE_PATH, 'utf8');  // Use readFileSync
        const entries = JSON.parse(data);
        entries.forEach(([key, value]) => {
            authTokenToUser.set(key, value);
        });
        console.log('Auth tokens loaded from file');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No existing auth tokens file found, starting fresh');
        } else {
            console.error('Error loading auth tokens:', error);
        }
    }
}

// Save auth tokens to file
async function saveAuthTokens() {
    try {
        const entries = Array.from(authTokenToUser.entries());
        fs.writeFileSync(AUTH_FILE_PATH, JSON.stringify(entries, null, 2));  // Use writeFileSync
        console.log('Auth tokens saved to file');
    } catch (error) {
        console.error('Error saving auth tokens:', error);
    }
}

function getUser(req){
    
    log("cookies... ", req.cookies, typeof req.cookies)
    const authToken = req.cookies.authToken 
    // Check if the authToken exists and is valid
    const user = authTokenToUser.get(authToken);
    if (!user) {
      throw new Error("User not authorized")
    }
    return user
}

const rooms = new Map()

//app.use('/multiplayer/node_modules', express.static(path.join(__dirname, 'node_modules')));
//
//app.get('/', (req, res) => {
//  res.redirect('/google');
//});
let io = new Server(server, {
    cors: {
        origin: [
            "/",
        ],
        methods: ["GET", "POST"]
    }
})
// WebSocket connection with auth validation
io.use((socket, next) => {
    log("validating ...")
    const { auth } = socket.handshake;
    const authToken = auth?.authToken;
    if (!authToken || !authTokenToUser.has(authToken)) {
        log("not Authorized")
        return next(new Error('Unauthorized'));
    }
    const user = authTokenToUser.get(authToken);
    socket.user = user
    log("Authorized ! ", user)
    next();
});
io.on("connection", socket => {
    log("connected !")
    _socket = socket
    // socket.emit("room-size", rooms.size)

    socket.on('joinRoom',async data => {
        const {name, roomNumber, avatarUrl } = data
        log(`joining room `, data)
        const roomNum = roomNumber
        let room = rooms.get(roomNum)
        if(!room) {
            room = await getRoom(roomNum)
            rooms.set(roomNum, room)
        }   
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
            roomNum,
            controller: undefined, //key//joystick//vr//teleport
            currentSpd: 1.3,
            // for vr items
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
        saveChangeDescription(room.sceneDescription, '1')
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
        // // Clean up any room-specific data
        // for (const [roomNum, room] of rooms.entries()) {
        //     const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        //     if (playerIndex !== -1) {
        //         room.players.splice(playerIndex, 1);
        //         io.to(roomNum).emit("player-left", socket.id);
        //         break;
        //     }
        // }
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
// Endpoint: Login authenticate
app.post('/login/authenticate', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'invalid', message: 'Username and password are required' });
    }

    const { isPasswordValid, account } = await login(username, password);

    if (isPasswordValid) {
        const authToken = generateUUID()
        
        res.cookie('authToken', authToken, {
            httpOnly: false,
            secure: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        })        
        authTokenToUser.set(authToken, account);
        await saveAuthTokens(); // Save after updating the Map

        res.status(200).json({ status: 'ok', message: 'Login successful' });
    } else {
        res.status(401).json({ status: 'invalid', message: 'Invalid username or password' });
    }
});

app.get("/login/logout", (req, res) => {
    try {
        // Get the auth token from cookies
        const authToken = req.cookies.authToken;
        
        // Remove from the Map if it exists
        if (authToken) {
            authTokenToUser.delete(authToken);
            // Save the updated tokens
            saveAuthTokens();
        }
        
        // Clear the cookie
        res.clearCookie('authToken', {
            httpOnly: false,
            secure: true,
            sameSite: 'strict'
        });
        
        res.status(200).json({ 
            message: "Logged out successfully", 
            status: 200 
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            message: "Error during logout", 
            status: 500 
        });
    }
});

app.get("/login/whoami", (req, res) => {
    try {
        const user = getUser(req);
        return res.json({ message: "ok", status: 200, user });
    } catch (error) {
        return res.status(401).json({ 
            message: "Not authenticated", 
            status: 401 
        });
    }
});

app.post('/sample/events/:id', async (req, res) => {
    const payload = req.body;
    const id = req.params.id;
    log("going into events")
    console.log("payload -> " + JSON.stringify(payload))
    // Validate that required fields exist
    // Check if payload exists
    if (!payload) {
        return res.status(400).json({
            error: "No payload received"
        });
    }

    // Check each required field independently
    if (!payload._id) {
        return res.status(400).json({
            error: "Missing required field: _id"
        });
    }

    if (!payload.type) {
        return res.status(400).json({
            error: "Missing required field: type"
        });
    }

    if (!payload.url) {
        return res.status(400).json({
            error: "Missing required field: url"
        });
    }

//    // Validate that ID in URL matches payload
//    if (id !== payload._id) {
//        return res.status(400).json({
//            error: "ID in URL must match _id in payload"
//        });
//    }

    // Log the incoming request
    console.log('Received configuration update:', payload);

    // Emit the full payload to all clients in the room
    // io.emit("scene-updated", [payload]);
    // io.emit("scene-updated", {...rooms.get(1).sceneDescription, payload});
    const array = rooms.get(id).sceneDescription
    array.push(payload)
    io.to(id).emit("scene-updated", array)
    log(`updating scene `, array)

    // Send success response
    res.status(200).json({
        message: "Configuration updated successfully",
        id: payload._id
    });
});
app.post("/register", async(req, res) => {
    const { id,username,password} = req.body
    const users = await loadUsers()
    
    log(req.body)
    try {
        const alreadyRegistered = users.find(user => user.username === username)
        if(alreadyRegistered) throw new Error("Username Already Taken")
        const newPass = await hashPassword(password)
        users.push({id,username,hash:newPass})
        await saveChanges(users)
        res.json({status: 200, message: "registered successfully", users})
    } catch (error) {
        res.json({status:401, message: error.message})
    }
})
loadAuthTokens().then(() => {
    server.listen(PORT, () => log("TCP server is on ", PORT));
});
