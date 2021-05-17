const express = require('express');
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 3000;
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

//Set static folder
app.use(express.static(path.join(__dirname, "public")));

//Start Server
server.listen(PORT, () => console.log(`Server runnung on port ${PORT}`))

//Handle a socket connection request from web client
const connections = [null,null];
io.on('connection', socket=>{
    //console.log('New WS Connection')

    //Find an available player number
    let playerIndex = -1;
    for(const i in connections){
        if(connections[i] == null){
            playerIndex = i;
            break;
        }
    }

    //Tell the connecting client what player number they are
    socket.emit('player-number', playerIndex);
    console.log(`Player ${playerIndex} has connected`);
    
    //Ignore Player 3
    if(playerIndex == -1) return;

    connections[playerIndex] = false;

    //Tell everyone what player number just connected
    socket.broadcast.emit('player-connection', playerIndex);

    //Handle Disonnect
    socket.on('disconnect', ()=>{
        console.log(`Player ${playerIndex} dc`)
        connections[playerIndex] = null;

        //Tell everyone what player number just disconnected
        socket.broadcast.emit('player-connection', playerIndex);
    })

    //On ready
    socket.on('player-ready', ()=>{
        socket.broadcast.emit('enemy-ready', playerIndex);
        connections[playerIndex] = true;
    })

    //Check player connections
    socket.on('check-players', () =>{
        const players = [];

        for(const i in connections){
            connections[i] == null ? players.push({connected: false, ready: false}) :
            players.push({connected: true, ready: connections[i]});
        }

        socket.emit('check-players', players);
    })

    //On Fire Received
    socket.on('fire', id =>{
        //Emit the move to the other player
        socket.broadcast.emit('fire', id);
    })

    //On fire Reply
    socket.on('fire-reply', square =>{
        //Forward the reply to the other player
        socket.broadcast.emit('fire-reply', square);
    })

    //Timeout Connection
    setTimeout(() =>{
        connections[playerIndex] = null;
        socket.emit('timout');
        socket.disconnect();
    }, 18000)//3 min limit per player
})