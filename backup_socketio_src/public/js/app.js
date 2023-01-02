const socket = io();    // io function 은 알아서 socket.io 를 실행하고 있는 서버를 찾는다.

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const nameForm = document.getElementById("nameForm");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function getRoomList(rooms) {
    const ul = document.querySelector("#welcome ul");
    ul.innerHTML = "";
    for(const room in rooms) {
        const li = document.createElement("li");
        li.innerText = `${room} (${rooms[room]})`;
        ul.appendChild(li);
    }
}

function setRoomTitle(new_count) {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${new_count})`;
}

function addMessage(message) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleNameSubmit(event) {
    event.preventDefault();
    const input = document.querySelector("#nameForm input");
    socket.emit("nickname", input.value);
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#chatForm input");
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${input.value}`);
        input.value = "";
    });
}

function showRoom(new_count) {
    setRoomTitle(new_count)

    welcome.hidden = true;
    room.hidden = false;

    const chatForm = room.querySelector("#chatForm");
    chatForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    /** [ emit 의 args ]
     * 1st arg. custom event name
     * other args. any-type, unlimited variable (javascript object도 보낼 수 있음)
     * ONE-LAST arg. callback function -> server에서는 실행 버튼만 누르고, 실행 위치는 client 이다! (**프론트에서 전송하는 코드가 백엔드에서 실행되는 건 심각한 보안 이슈)
     * 장점: 백엔드에서 콜백함수를 통해 arg 를 넘겨줄 수 있다.
     */
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleRoomSubmit);
nameForm.addEventListener("submit", handleNameSubmit);

socket.on("welcome", (nickname, new_count) => {
    setRoomTitle(new_count)

    addMessage(`${nickname} joined!!`);
})

socket.on("bye", (nickname, new_count) => {
    setRoomTitle(new_count)

    addMessage(`${nickname} leaved!!`);
})

socket.on("new_message", addMessage);

socket.on("room_change", getRoomList);