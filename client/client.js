/* List of Client Packets and arguments */
//		chat (2 args): style (optional), message
//		client_setup (1 arg): username

const serverHost = 'https://websocket-chatbox.fly.dev';

socket = null;
const usernameInput = document.getElementById('usernameText');
const messageInput = document.getElementById('chatText');
function initializeSocket() {
	socket = new WebSocket(serverHost);
	addMessage(`Connecting to server...`);
	setChatVisibility(true);

	socket.onopen = () => {
		addMessage('Connection established!', '#009F00');
		socket.send(formatPacket('client_setup', usernameText.value));
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
		}
	};

	socket.onclose = (event) => {
		addMessage('Server closed, connection terminated!');
		setChatVisibility(false);
		socket = null;
	};

	socket.onerror = (event) => {
		addMessage('ERROR CODE: ' + event.code);
		setChatVisibility(false);
		socket = null;
	};
}

function sendMessageBtn() {
	socket.send(formatPacket('chat', messageInput.value));
}

const chatBox = document.getElementById('messages');
function addMessage(message, styles = null)
{
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
	chatBox.appendChild(newMessage);
	//console.log(message);
}

function setChatVisibility(toggle) {
	if(toggle) {
		document.getElementById('onlineDiv').style.display = 'block';
		document.getElementById('offlineDiv').style.display = 'none';
	} else {
		document.getElementById('onlineDiv').style.display = 'none';
		document.getElementById('offlineDiv').style.display = 'block';
	}
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