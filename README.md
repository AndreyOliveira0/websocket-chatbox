# WebSocket Chatbox
A simple WebSocket Chatbox browser app, written in JavaScript.

This project was made with the intent of learning more about WebSocket and server deployment through [Fly.io](https://fly.io/).

[Click here to access the sample page.](https://andreyoliveira0.github.io/websocket-chatbox/)

![image](https://github.com/user-attachments/assets/0feab532-067c-43e5-8705-3bb26a02c9f1)
___
## Features
- Server:
  - Server packets received are logged into a `.txt` file.
  - Sends message history of the last 100 messages when a new user joins.
  - Prevents duplicated usernames.
  - WebSocket TCP connection.

- Client:
  - Lists users connected at the right side of the chatbox.
  - Browser cookies saves username.
  - Hyperlinks can be sent in chat.
  - Proper Light/Dark theme support through CSS.
  - Character limit for messages and spam prevention.
