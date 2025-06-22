const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now
        cb(null, true);
    }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Store connected clients and chat history
const clients = new Map();
const chatHistory = [];
const MAX_MESSAGES = 128;

// Generate unique ID for each client
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Broadcast message to all connected clients
function broadcast(message, excludeClient = null) {
    const messageString = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Get list of online users
function getOnlineUsers() {
    const users = Array.from(clients.values()).map(client => ({
        id: client.id,
        username: client.username,
        color: client.color,
        website: client.website || ''
    }));
    return users;
}

wss.on('connection', (ws) => {
    const clientId = generateId();
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'join':
                    // Store client info
                    const clientInfo = {
                        id: clientId,
                        username: message.username,
                        color: message.color,
                        website: message.website || '',
                        isTyping: false,
                        ws: ws
                    };
                    clients.set(clientId, clientInfo);
                    
                    // Send chat history to new client
                    ws.send(JSON.stringify({
                        type: 'history',
                        messages: chatHistory
                    }));
                    
                    // Send updated user list to all clients
                    broadcast({
                        type: 'userList',
                        users: getOnlineUsers(),
                        count: clients.size
                    });
                    
                    // Notify others about new user
                    broadcast({
                        type: 'userJoined',
                        username: message.username,
                        color: message.color
                    }, ws);
                    break;
                    
                case 'message':
                    const client = clients.get(clientId);
                    if (client) {
                        console.log('Received message from', client.username);
                        console.log('Message content:', message.content);
                        console.log('Message attachments:', message.attachments);
                        console.log('Reply data:', message.replyTo);
                        
                        const chatMessage = {
                            type: 'message',
                            id: generateId(),
                            username: client.username,
                            color: client.color,
                            content: message.content,
                            timestamp: Date.now()
                        };
                        
                        // Add attachments if present
                        if (message.attachments && message.attachments.length > 0) {
                            console.log('Adding attachments to message:', message.attachments.length);
                            chatMessage.attachments = message.attachments;
                        }
                        
                        // Add reply data if present
                        if (message.replyTo) {
                            console.log('Adding reply data to message');
                            chatMessage.replyTo = message.replyTo;
                        }
                        
                        console.log('Broadcasting message:', chatMessage);
                        
                        // Add to history and maintain max size
                        chatHistory.push(chatMessage);
                        if (chatHistory.length > MAX_MESSAGES) {
                            chatHistory.shift(); // Remove oldest message
                        }
                        
                        // Broadcast to all clients
                        broadcast(chatMessage);
                    }
                    break;
                    
                case 'typing':
                    const typingClient = clients.get(clientId);
                    if (typingClient) {
                        // Update typing status
                        typingClient.isTyping = message.isTyping;
                        
                        broadcast({
                            type: 'typing',
                            userId: clientId,
                            username: typingClient.username,
                            isTyping: message.isTyping
                        }, ws);
                    }
                    break;
                    
                case 'updateUser':
                    const updateClient = clients.get(clientId);
                    if (updateClient) {
                        // Update stored client info
                        updateClient.username = message.username;
                        updateClient.color = message.color;
                        updateClient.website = message.website || '';
                        
                        // Broadcast updated user list to all clients
                        broadcast({
                            type: 'userList',
                            users: getOnlineUsers(),
                            count: clients.size
                        });
                        
                        // Notify about user update
                        broadcast({
                            type: 'userUpdated',
                            userId: clientId,
                            username: message.username,
                            color: message.color,
                            website: message.website || ''
                        }, ws);
                    }
                    break;
                    
                case 'cursor':
                    const cursorClient = clients.get(clientId);
                    if (cursorClient) {
                        broadcast({
                            type: 'cursor',
                            userId: clientId,
                            username: cursorClient.username,
                            color: cursorClient.color,
                            isTyping: cursorClient.isTyping,
                            x: message.x,
                            y: message.y
                        }, ws);
                    }
                    break;
                    
                case 'editMessage':
                    console.log('🔧 Server received editMessage:', message);
                    const editClient = clients.get(clientId);
                    if (editClient) {
                        console.log('🔧 Edit client found:', editClient.username);
                        // Find the message in chat history
                        const messageIndex = chatHistory.findIndex(msg => msg.id === message.messageId);
                        console.log('🔧 Message index found:', messageIndex);
                        if (messageIndex !== -1) {
                            const originalMessage = chatHistory[messageIndex];
                            console.log('🔧 Original message:', originalMessage);
                            console.log('🔧 Username match?', originalMessage.username === editClient.username);
                            // Only allow editing own messages
                            if (originalMessage.username === editClient.username) {
                                // Update the message content
                                chatHistory[messageIndex].content = message.newContent;
                                chatHistory[messageIndex].edited = true;
                                chatHistory[messageIndex].editedAt = Date.now();
                                
                                console.log('🔧 Message updated, broadcasting edit');
                                
                                // Broadcast the edit to all clients
                                broadcast({
                                    type: 'messageEdited',
                                    messageId: message.messageId,
                                    newContent: message.newContent,
                                    editedBy: editClient.username
                                });
                            } else {
                                console.log('🔧 Username mismatch, edit rejected');
                            }
                        } else {
                            console.log('🔧 Message not found in history');
                        }
                    } else {
                        console.log('🔧 Edit client not found');
                    }
                    break;
                    
                case 'deleteMessage':
                    console.log('🔧 Server received deleteMessage:', message);
                    const deleteClient = clients.get(clientId);
                    if (deleteClient) {
                        console.log('🔧 Delete client found:', deleteClient.username);
                        // Find the message in chat history
                        const messageIndex = chatHistory.findIndex(msg => msg.id === message.messageId);
                        console.log('🔧 Message index found:', messageIndex);
                        if (messageIndex !== -1) {
                            const originalMessage = chatHistory[messageIndex];
                            console.log('🔧 Original message:', originalMessage);
                            console.log('🔧 Username match?', originalMessage.username === deleteClient.username);
                            // Only allow deleting own messages
                            if (originalMessage.username === deleteClient.username) {
                                // Mark the message as deleted
                                chatHistory[messageIndex].content = 'message deleted by user';
                                chatHistory[messageIndex].deleted = true;
                                chatHistory[messageIndex].deletedAt = Date.now();
                                
                                console.log('🔧 Message deleted, broadcasting deletion');
                                
                                // Broadcast the deletion to all clients
                                broadcast({
                                    type: 'messageDeleted',
                                    messageId: message.messageId,
                                    deletedBy: deleteClient.username
                                });
                            } else {
                                console.log('🔧 Username mismatch, delete rejected');
                            }
                        } else {
                            console.log('🔧 Message not found in history');
                        }
                    } else {
                        console.log('🔧 Delete client not found');
                    }
                    break;
                    
                case 'systemMessage':
                    // Broadcast system message to all clients
                    broadcast({
                        type: 'systemMessage',
                        message: message.message
                    });
                    break;
                    
                case 'fakeMessage':
                    // Create a fake message from specified user
                    // First, try to find if this fake user already exists to get their color
                    let fakeUserColor = '#ff6b6b'; // Default color
                    for (const [id, client] of clients.entries()) {
                        if (client.username === message.username && client.isFake) {
                            fakeUserColor = client.color;
                            break;
                        }
                    }
                    
                    const fakeMessageData = {
                        type: 'message',
                        id: generateId(),
                        username: message.username,
                        color: fakeUserColor,
                        content: message.message,
                        timestamp: Date.now()
                    };
                    
                    // Add to history and maintain max size
                    chatHistory.push(fakeMessageData);
                    if (chatHistory.length > MAX_MESSAGES) {
                        chatHistory.shift();
                    }
                    
                    // Broadcast to all clients
                    broadcast(fakeMessageData);
                    break;
                    
                case 'fakeConnect':
                    // Create a fake user connection
                    const fakeUserId = generateId();
                    const fakeUserInfo = {
                        id: fakeUserId,
                        username: message.username,
                        color: message.color,
                        website: '',
                        isTyping: false,
                        ws: null, // Fake users don't have websocket connections
                        isFake: true
                    };
                    
                    clients.set(fakeUserId, fakeUserInfo);
                    
                    // Send updated user list to all clients
                    broadcast({
                        type: 'userList',
                        users: getOnlineUsers(),
                        count: clients.size
                    });
                    
                    // Notify others about fake user joining
                    broadcast({
                        type: 'userJoined',
                        username: message.username,
                        color: message.color
                    });
                    break;
                    
                case 'fakeDisconnect':
                    // Find and remove fake user by username
                    let fakeUserToRemove = null;
                    let fakeUserIdToRemove = null;
                    
                    for (const [id, client] of clients.entries()) {
                        if (client.username === message.username && client.isFake) {
                            fakeUserToRemove = client;
                            fakeUserIdToRemove = id;
                            break;
                        }
                    }
                    
                    if (fakeUserToRemove) {
                        // Notify others about fake user leaving
                        broadcast({
                            type: 'userLeft',
                            username: fakeUserToRemove.username
                        });
                        
                        clients.delete(fakeUserIdToRemove);
                        
                        // Send updated user list
                        broadcast({
                            type: 'userList',
                            users: getOnlineUsers(),
                            count: clients.size
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        const client = clients.get(clientId);
        if (client) {
            // Notify others about user leaving
            broadcast({
                type: 'userLeft',
                username: client.username
            });
            
            clients.delete(clientId);
            
            // Send updated user list
            broadcast({
                type: 'userList',
                users: getOnlineUsers(),
                count: clients.size
            });
        }
    });
});

// File upload endpoint
app.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            type: file.mimetype,
            url: `/uploads/${file.filename}`
        }));

        res.json({ files: uploadedFiles });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
    console.log(`Network access: http://<your-ip>:${PORT}`);
}); 