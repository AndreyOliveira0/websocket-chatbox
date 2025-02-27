/* List of Sent Client Packets and arguments */
//		chat (2 args): style, message
//		client_setup (1 arg): username

/* List of Received Client Packets and arguments */
//		chat (2 args): style, message
//		greeting (1 arg): username
//		user_list (X args) - each arg is a different username
//		client_join (1 arg): username
//		client_left (1 arg): username

const serverHost = 'https://websocket-chatbox.fly.dev';
const MESSAGE_COOLDOWN = 0.5; //in seconds

socket = null;
const usernameInput = document.getElementById('usernameText');
const messagesDiv = document.getElementById('messagesDiv');
const usersDiv = document.getElementById('usersDiv');
const messageInput = document.getElementById('chatText');
const sendButton = document.getElementById('chatSendButton');
const userList = document.getElementById('users');
const chatBox = document.getElementById('messages');

function initializeSocket() {
	if(socket != null) return;

	socket = new WebSocket(serverHost);
	addMessage(`Connecting to server...`, '#9F9F9F');
	setChatVisibility(true);

	socket.onopen = () => {
		addMessage('Connection established!', '#009F00');
		socket.send(formatPacket('client_setup', usernameInput.value));
	};

	socket.onmessage = (event) => {
		let data = event.data;
		let splitData = packetSplit(data);
		let eventName = splitData.shift();
		
		switch(eventName) {
			case 'chat': {
				let styles = splitData.shift();
				let message = packetDataJoin(splitData);
				addMessage(message, styles);
				break;
			}
			case 'greeting': {
				let username = splitData.shift();
				addMessage(`Welcome to the chat, ${username}!`, '#009F00');
				break;
			}
			case 'user_list': {
				for (user of splitData) {
					addUser(user);
				}
				break;
			}
			case 'client_join': {
				let username = splitData.shift();
				addMessage(`${username} entered the chat, welcome!`, '#009F00');
				addUser(username);
				break;
			}
			case 'client_left': {
				let username = splitData.shift();
				addMessage(`${username} left the chat.`, '#9F9F9F');
				removeUser(username);
				break;
			}
		}
	};

	socket.onclose = (event) => {
		addMessage('Server closed, connection terminated!');
		setChatVisibility(false);
		userList.replaceChildren();
		socket = null;
	};

	socket.onerror = (event) => {
		addMessage('ERROR CODE: ' + event.code);
		setChatVisibility(false);
		userList.replaceChildren();
		socket = null;
	};
}

function addMessage(message, styles = null) {
	let newMessage = document.createElement('li');
	newMessage.textContent = message;
	if(styles != null && styles.trim().length > 0) {
		for (let style of styles.split(',')) {
			style = style.trim();
			switch(style.toLowerCase()) {
				case 'bold':
					newMessage.style.fontWeight = 'bold';
					break;
				case 'null':
					break;
				default:
					if(style.startsWith('#')) { // is color
						newMessage.style.color = style;
					} else if(style != null && style.length > 0) {
						throw new Error(`Invalid message style: ${style}`);
					}
			}
		}
	}
	newMessage.innerHTML = hyperlinkCheck(newMessage.innerHTML);
	chatBox.appendChild(newMessage);
	//console.log(message);

	let distanceToBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
	if(distanceToBottom <= 50) messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addUser(username) {
	let userItem = document.createElement('li');
	userItem.textContent = username;
	userList.appendChild(userItem);
}

function removeUser(username) {
	for (user of userList.children) {
		if(username === user.textContent) {
			userList.removeChild(user);
			return;
		}
	}
}

function hyperlinkCheck(text) {
	return text.replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi, function(match) {
		let url = match.startsWith("www.") ? "https://" + match : match; // Add "https://" if missing
		return `<a href="${url}" target="_blank">${match}</a>`;
	});
}

lastMessageTime = Date.now();
function sendMessageBtn() {
	if(messageInput.value.trim() == '') return;

	let currentTime = Date.now();
	let timeLeft = MESSAGE_COOLDOWN - (currentTime - lastMessageTime) / 1000.0;
	if(timeLeft > 0) {
		addMessage(`You must wait more ${Math.ceil(timeLeft * 10) / 10} seconds before sending another message!`, '#FF0000');
		return;
	}

	socket.send(formatPacket('chat', messageInput.value));
	lastMessageTime = currentTime;
	messageInput.value = '';
	messagesDiv.scrollTop = messagesDiv.scrollHeight;
	updateSendButton();
}

messageInput.addEventListener('input', updateSendButton);
function updateSendButton() {
	if(socket == null) {
		sendButton.disabled = true;
		return;
	}
	sendButton.disabled = messageInput.value.trim().length < 1;
}

function handleKeyPressMsg(event) {
	if (event.key === 'Enter' && socket != null) {
		sendMessageBtn();
	}
}

function handleKeyPressConnect(event) {
	if (event.key === 'Enter' && socket == null) {
		initializeSocket();
	}
}

const mainDiv = document.getElementById('mainDiv');
const connectDiv = document.getElementById('connectDiv');
function setChatVisibility(toggle) {
	updateSendButton();
	connectDiv.style.display = toggle ? 'none' : 'block';
	mainDiv.style.height = toggle ? 'calc(100vh - 170px)' : 'calc(100vh - 240px)';
	usersDiv.style.height = messagesDiv.style.height = toggle ? 'calc(100vh - 230px)' : 'calc(100vh - 300px)';
	mainDiv.style.marginTop = toggle ? '51px' : '25px';
}
setChatVisibility(false);

/* PACKET FUNCTIONS */

// Formats a string to send for clients
function formatPacket(event, ...packetArgs) {
	let str = event;
	for (let arg of packetArgs) {
		str += PACKET_JOIN_STRING;
		str += arg;
	}
	return str;
}

const PACKET_JOIN_STRING = ':>:'; // Must be the same in client.js
// Splits packet string
function packetDataJoin(data) {
	return data.join(PACKET_JOIN_STRING);
}
// Restore a split packet string
function packetSplit(data) {
	return data.split(PACKET_JOIN_STRING);
}