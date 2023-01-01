import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname +  "/views")
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

const server = http.createServer(app);              // express.js 를 이용한 http Server 생성
const wss = new WebSocket.Server({ server });       // http Server 위에 ws Server 생성 -> 동일한 port 에서 http, ws 둘 다 처리 가능

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

server.listen(3000, handleListen);
