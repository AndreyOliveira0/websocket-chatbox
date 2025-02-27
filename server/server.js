const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const serverHost = '0.0.0.0';
const serverPort = 3000;

const server = new WebSocket.Server({ host: serverHost, port: serverPort });
console.log(`Server initialized on ws://${serverHost}:${serverPort}`);

const usernames = new Map();

const ENABLE_SERVER_LOG = true;
const MAX_MESSAGE_HISTORY = 100; //Max of last 100 messages history to send to users who just joined
messageHistory = [];

server.on('connection', (client) => {
	client.on('message', (message) => {
		//console.log(message.toString());
		let data = packetSplit(message.toString());
		switch(data.shift()) // packet event name
		{
			case 'chat': {
				let chatMessage = packetDataJoin(data);
				if(chatMessage.trim().length < 1) break;

				let username = usernames.get(client);
				chatMessage = `${username}: ${chatMessage}`;
				
				const formattedTime = getTimeString();
				let messageToSend = `${formattedTime} - ${chatMessage}`;
				messageHistory.push(messageToSend);
				if(messageHistory.length > MAX_MESSAGE_HISTORY) messageHistory.shift();

				consoleLog(`[${formattedTime}] CHAT - ${chatMessage}`);
				serverBroadcast(client, 'chat', null, messageToSend);
				serverSend(client, 'chat', 'bold', `> ${messageToSend}`);
				break;
			}
			case 'client_setup': {
				let username = packetDataJoin(data).replace(PACKET_JOIN_STRING, '').trim();
				if(username.length < 1) {
					let i = 0;
					server.clients.forEach(client => {
						if (client.readyState === WebSocket.OPEN) {
							i++;
						}
					});
					while(true) {
						username = `User #${i}`;
						if(![...usernames.values()].includes(username)) {
							break;
						}
						i++;
					}
				}
				else
				{
					// Check for duplicated usernames
					let i = 0;
					let isDuplicated = false;
					let fixedName = username;
					while(true) {
						if(i != 0) fixedName = `${username} (${i})`;
	
						let isDuplicated = false;
						usernames.forEach((user) => {
							if(user == fixedName) isDuplicated = true;
						});
	
						if(!isDuplicated) break;
						i++;
					}
					username = fixedName;
				}

				usernames.set(client, username);
				consoleLog(`[${getTimeString()}] JOINED - ${username}`); // Message will be sent to everyone, except for whoever just joined.
				
				let userNum = 1;
				let dataToSend = formatPacket('client_join', username);
				let userList = [];
				server.clients.forEach(socket => {
					if (socket.readyState === WebSocket.OPEN) {
						if(socket != client)
						{
							socket.send(dataToSend);
							userNum++;
						}
						userList.push(usernames.get(socket));
					}
				});
				client.send(formatPacket('user_list', packetDataJoin(userList)));
				for (message of messageHistory) {
					client.send(formatPacket('chat', '#9F9F9F', message));
				}
				client.send(formatPacket('greeting', username));
				break;
			}
		}
	});

	client.on('close', (message) => {
		const date = new Date(Date.now());
		let username = usernames.get(client);
		consoleLog(`[${getTimeString()}] DISCONNECT - ${username} | CODE: ${message}`);
		serverBroadcast(client, 'client_left', username);
		usernames.delete(client);
	});
});

// Broadcast a packet, with an optional client to ignore
function serverBroadcast(ignoreClient, event, ...packetArgs) {
	let dataToSend = formatPacket(event, ...packetArgs);
	server.clients.forEach(client => {
		if (ignoreClient != client && client.readyState === WebSocket.OPEN) {
			client.send(dataToSend);
		}
	});
}

// Send a packet to a specific client only
function serverSend(client, event, ...packetArgs) {
	client.send(formatPacket(event, ...packetArgs));
}

// Used for server logging
function getTimeString() {
	const date = new Date(Date.now());
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

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

/* SERVER LOG */
logStream = null;
if(ENABLE_SERVER_LOG)
{
	const date = new Date(Date.now());
	const year = date.getUTCFullYear().toString();
	const months = (date.getUTCMonth() + 1).toString().padStart(2, '0');
	const days = date.getUTCDate().toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	const dateStr = `${year}-${months}-${days}_${hours}-${minutes}-${seconds}`;
	
	// Ensure logs directory exists
	const logsDir = path.join(__dirname, 'logs');
	if (!fs.existsSync(logsDir)) {
		fs.mkdirSync(logsDir, { recursive: true });
	}

	// Init log file
	const logFilePath = path.join(logsDir, dateStr + '.txt');
	logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
}

function consoleLog(message) {
	if(ENABLE_SERVER_LOG) logStream.write(message + '\n');
	console.log(message);
}