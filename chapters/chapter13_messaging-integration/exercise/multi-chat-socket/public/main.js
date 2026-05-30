const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');

// Get username and room from URL query string
const params = new URLSearchParams(window.location.search);
const username = params.get('username') || 'Anonymous';
const room = params.get('room') || 'general';
console.log(`username: ${username}`)
console.log(`room: ${room}`)

// Establish a connection to the server
const socket = io();

// Join a specific chat room
socket.emit('joinRoom', { username, room });

// Display the current room name on the sidebar
roomName.innerText = room;

// Listen for incoming messages from the server
socket.on('message', message => {
    outputMessage(message);

    // Scroll down to the latest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Handle chat form submission
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get the message text from the input field
    const msg = e.target.elements.msg.value;

    // Emit the message to the server
    socket.emit('chatMessage', msg);

    // Clear the input field and focus it for the next message
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// Function to append a new message to the chat window
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.username} <span>${new Date().toLocaleTimeString()}</span></p>
    <p class="text">
        ${message.text}
    </p>`;
    document.querySelector('.chat-messages').appendChild(div);
}
