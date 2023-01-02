import http from "http";
// import WebSocket from "ws";
// import SocketIO from "socket.io";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname +  "/views")
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

const httpServer = http.createServer(app);              // express.js 를 이용한 http Server 생성
// const wsServer = SocketIO(httpServer);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    }
});

instrument(wsServer, {
    auth: false
});

function getPublicRooms() {
    // const sids = wsServer.sockets.adapter.sids;
    // const rooms = wsServer.sockets.adapter.rooms;
    const {
        sockets: {
            adapter: { sids, rooms },
        },
    } = wsServer;

    const publicRooms = {};
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms[key] = rooms.get(key).size;
        }
    });

    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
    socket["nickname"] = "익명";
    wsServer.sockets.emit("room_change", getPublicRooms());
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`);
    })
    socket.on("enter_room", (roomName, done) => {
        // socket.join(msg.payload);
        socket.join(roomName);
        done(countRoom(roomName));
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName)); // **나 빼고
        wsServer.sockets.emit("room_change", getPublicRooms());
    })
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => {
            socket.to(room).emit("bye", socket.nickname, countRoom(room)-1);
        });
    })
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", getPublicRooms());
    })
    socket.on("new_message", (msg, roomName, done) => {
        socket.to(roomName).emit("new_message", `${socket.nickname} : ${msg}`);
        done();
    })
    socket.on("nickname", (nickname) => {
        socket["nickname"] = nickname;
    })
})

/* ws code
const wss = new WebSocket.Server({ httpServer });       // http Server 위에 ws Server 생성 -> 동일한 port 에서 http, ws 둘 다 처리 가능
const sockets = [];
wss.on("connection", (socket) => {
    sockets.push(socket);
    socket["nickname"] = "익명";
    console.log("Connected to Browser!!");
    socket.on("close", () => console.log("Disconnected from Browser"))
    socket.on("message", (msg) => {
        const message = JSON.parse(msg.toString());
        switch(message.type) {
            case "new_message":
                sockets.forEach(aSocket => {
                    if (aSocket != socket) aSocket.send(`${socket.nickname}: ${message.payload}`)
                });
                break;
            case "nickname":
                socket["nickname"] = message.payload;
                break;
        }
    })
});
*/

httpServer.listen(3000, handleListen);
