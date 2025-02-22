const WebSocket = require('ws');
const serverHost = '0.0.0.0';
const serverPort = 3000;

const server = new WebSocket.Server({ host: serverHost, port: serverPort });
console.log(`Server initialized on ws://${serverHost}:${serverPort}`);

succeededConnections = 0;
const usernames = new Map();

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

				console.log(`CHAT - ${chatMessage}`);
				serverBroadcast(client, 'chat', null, chatMessage);
				serverSend(client, 'chat', 'bold', `> ${chatMessage}`);
				break;
			}
			case 'client_setup': {
				succeededConnections++;
				let username = packetDataJoin(data).trim();
				if(username.length < 1) {
					
					username = `User #${succeededConnections}`;
				}

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

				usernames.set(client, username);
				console.log(`JOINED - ${username}`); // Message will be sent to everyone, except for whoever just joined.
				
				let userNum = 1;
				let dataToSend = formatPacket('chat', '#009F00', `New client connected! Welcome, ${username}!`);
				server.clients.forEach(socket => {
					if (socket != client && socket.readyState === WebSocket.OPEN) {
						socket.send(dataToSend);
						userNum++;
					}
				});
				client.send(formatPacket('chat', 'bold', `Welcome to the chat, ${username}!\r\nClients connected: ${userNum}`));
				break;
			}
		}
	});

	client.on('close', (message) => {
		console.log(`DISCONNECT - ${usernames.get(client)} | CODE: ${message}`);
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