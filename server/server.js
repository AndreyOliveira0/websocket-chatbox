const WebSocket = require('ws');
const serverHost = '0.0.0.0';
const serverPort = 3000;

const server = new WebSocket.Server({ host: serverHost, port: serverPort });
console.log(`Server initialized on ws://${serverHost}:${serverPort}`);

const usernames = new Map();

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
				
				const date = new Date(Date.now());
				const hours = date.getHours().toString().padStart(2, '0');
				const minutes = date.getMinutes().toString().padStart(2, '0');
				const seconds = date.getSeconds().toString().padStart(2, '0');
				
				const formattedTime = `${hours}:${minutes}:${seconds}`;

				let messageToSend = `${formattedTime} - ${chatMessage}`;
				messageHistory.push(messageToSend);
				if(messageHistory.length > MAX_MESSAGE_HISTORY) messageHistory.shift();

				console.log(`CHAT - (${formattedTime}) ${chatMessage}`);
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
				console.log(`JOINED - ${username}`); // Message will be sent to everyone, except for whoever just joined.
				
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
				break;
			}
		}
	});

	client.on('close', (message) => {
		let username = usernames.get(client);
		console.log(`DISCONNECT - ${username} | CODE: ${message}`);
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

//Send a packet to a specific client only
function serverSend(client, event, ...packetArgs) {
	client.send(formatPacket(event, ...packetArgs));
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