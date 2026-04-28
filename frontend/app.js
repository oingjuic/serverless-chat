const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username-input');
const statusDot = document.getElementById('status-dot');
const connectionStatus = document.getElementById('connection-status');
const typingIndicator = document.getElementById('typing-indicator');
const roomTitle = document.getElementById('room-title');
const channelList = document.getElementById('channel-list');
const addRoomBtn = document.getElementById('add-room-btn');
const newRoomContainer = document.getElementById('new-room-container');
const newRoomInput = document.getElementById('new-room-input');

let typingTimeout;
let currentRoom = 'general';
let rooms = ['general', 'study-group', 'random'];

function renderRooms() {
    channelList.innerHTML = '';
    rooms.forEach(room => {
        const li = document.createElement('li');
        li.className = `channel ${currentRoom === room ? 'active' : ''}`;
        li.setAttribute('data-room', room);
        
        const span = document.createElement('span');
        span.textContent = '# ' + room;
        li.appendChild(span);
        
        if (room !== 'general') {
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-room-btn';
            delBtn.innerHTML = '×';
            delBtn.title = 'Delete Room';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                rooms = rooms.filter(r => r !== room);
                if (currentRoom === room) {
                    switchToRoom('general');
                } else {
                    renderRooms();
                }
            };
            li.appendChild(delBtn);
        }
        
        li.onclick = () => switchToRoom(room);
        channelList.appendChild(li);
    });
}

function switchToRoom(room) {
    currentRoom = room;
    roomTitle.textContent = '# ' + currentRoom;
    chatBox.innerHTML = '';
    addSystemMessage(`Joining #${currentRoom}...`);
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'joinroom', room: currentRoom }));
    }
    renderRooms();
}

addRoomBtn.addEventListener('click', () => {
    newRoomContainer.classList.toggle('hidden');
    if (!newRoomContainer.classList.contains('hidden')) {
        newRoomInput.focus();
    }
});

newRoomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const newRoom = newRoomInput.value.trim();
        if (newRoom) {
            const roomName = newRoom.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            if (!rooms.includes(roomName)) {
                rooms.push(roomName);
                switchToRoom(roomName);
            }
            newRoomInput.value = '';
            newRoomContainer.classList.add('hidden');
        }
    } else if (e.key === 'Escape') {
        newRoomContainer.classList.add('hidden');
        newRoomInput.value = '';
    }
});

renderRooms();

const wsUrl = 'wss://chat-server-native.webpubsub.azure.com/client/hubs/chat?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ3c3M6Ly9jaGF0LXNlcnZlci1uYXRpdmUud2VicHVic3ViLmF6dXJlLmNvbS9jbGllbnQvaHVicy9jaGF0IiwiaWF0IjoxNzc3MzY5NDkwLCJleHAiOjE3Nzc0NTU4OTB9.VtnzTngbIzZKY0JR1VjZ2m_uXfmpZvBR6tUwHluHfx8';
let socket;

function connect() {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        statusDot.className = 'status-indicator connected';
        connectionStatus.textContent = 'Connected';
        socket.send(JSON.stringify({ action: 'joinroom', room: currentRoom }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.action === 'message') {
                const currentUsername = usernameInput.value.trim() || 'Anonymous';
                if (data.sender !== currentUsername) {
                    addMessage(data.sender, data.content, false);
                }
            } else if (data.action === 'system') {
                addSystemMessage(data.content);
            } else if (data.action === 'typing') {
                const currentUsername = usernameInput.value.trim() || 'Anonymous';
                if (data.sender !== currentUsername) {
                    typingIndicator.textContent = `${data.sender} is typing...`;
                    typingIndicator.classList.remove('hidden');
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        typingIndicator.classList.add('hidden');
                    }, 2000);
                }
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    };

    socket.onclose = () => {
        statusDot.className = 'status-indicator disconnected';
        connectionStatus.textContent = 'Disconnected. Retrying...';
        setTimeout(connect, 3000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
}

function addMessage(sender, text, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    if (!isSent) {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender-name';
        senderSpan.textContent = sender || 'Anonymous';
        messageDiv.appendChild(senderSpan);
    }

    const textNode = document.createTextNode(text);
    messageDiv.appendChild(textNode);
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    const now = new Date();
    timeSpan.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageDiv.appendChild(timeSpan);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message';
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const content = messageInput.value.trim();
    const sender = usernameInput.value.trim() || 'Anonymous';

    if (content && socket.readyState === WebSocket.OPEN) {
        const payload = {
            action: 'sendmessage',
            sender: sender,
            content: content,
            room: currentRoom
        };
        
        socket.send(JSON.stringify(payload));
        addMessage(sender, content, true);
        messageInput.value = '';
    }
});

messageInput.addEventListener('input', () => {
    const sender = usernameInput.value.trim() || 'Anonymous';
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'typing', sender: sender, room: currentRoom }));
    }
});

connect();
