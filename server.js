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

// Enhanced logging middleware to debug URL issues
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Incoming request:`);
    console.log(`  Raw URL: ${req.url}`);
    console.log(`  Method: ${req.method}`);
    console.log(`  User-Agent: ${req.headers['user-agent']}`);
    console.log(`  Referer: ${req.headers.referer || 'none'}`);
    console.log(`  IP: ${req.ip || req.connection.remoteAddress}`);
    
    // Try to decode the URL and catch any issues
    try {
        const decoded = decodeURIComponent(req.url);
        if (decoded !== req.url) {
            console.log(`  Decoded URL: ${decoded}`);
        }
        // Check for weird characters
        if (decoded.match(/[""]/)) {
            console.log(`  ⚠️  SUSPICIOUS: URL contains smart quotes!`);
        }
        if (decoded.includes('">') || decoded.includes('">>')) {
            console.log(`  ⚠️  SUSPICIOUS: URL contains HTML-like content!`);
        }
    } catch (error) {
        console.log(`  ❌ URL decode error: ${error.message}`);
    }
    next();
});

// File upload endpoint (MUST be before catch-all route)
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

// Explicit route for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle any other routes by serving index.html (SPA fallback)
app.get('*', (req, res) => {
    // Decode the URL to check for malformed requests
    try {
        const decodedUrl = decodeURIComponent(req.url);
        console.log('Decoded URL request:', decodedUrl);
        
        // If it's a malformed request or strange encoding, redirect to root
        if (decodedUrl.includes('">') || decodedUrl.includes('">>') || decodedUrl.match(/[""]/)) {
            console.log('Redirecting malformed URL to root:', decodedUrl);
            return res.redirect('/');
        }
    } catch (error) {
        console.log('URL decode error, redirecting to root:', req.url);
        return res.redirect('/');
    }
    
    // Otherwise serve the index.html for any unmatched routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected clients and chat history
const clients = new Map();
const chatHistory = [];
const dmHistory = new Map(); // Store DM conversations by IP pairs
const ipMutes = new Map(); // Store IP mutes with expiration times
const ipSpamTracking = new Map(); // Track spam by IP instead of client
const MAX_MESSAGES = 128;
const MAX_DM_MESSAGES = 512; // Separate limit for DM conversations

// Generate unique ID for each client
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Create DM conversation key from two IPs (sorted for consistency)
function getDMKey(ip1, ip2) {
    return [ip1, ip2].sort().join('_');
}

// Get DM history between two IPs
function getDMHistory(ip1, ip2) {
    const key = getDMKey(ip1, ip2);
    if (!dmHistory.has(key)) {
        dmHistory.set(key, []);
    }
    return dmHistory.get(key);
}

// Add DM message to history
function addDMMessage(ip1, ip2, message) {
    const key = getDMKey(ip1, ip2);
    if (!dmHistory.has(key)) {
        dmHistory.set(key, []);
    }
    const conversation = dmHistory.get(key);
    conversation.push(message);
    
    // Maintain max size for DM conversations (512 messages)
    if (conversation.length > MAX_DM_MESSAGES) {
        conversation.shift();
    }
}

// Broadcast message to all connected clients
function broadcast(message, excludeClient = null) {
    const messageString = JSON.stringify(message);
    console.log(`📢 Broadcasting ${message.type} to ${clients.size} clients`);
    
    clients.forEach((client, clientId) => {
        if (client.ws && client.ws !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageString);
                console.log(`✅ Sent ${message.type} to ${client.username}`);
            } catch (error) {
                console.error(`❌ Error sending message to ${client.username}:`, error);
                // Remove broken client connection
                clients.delete(clientId);
            }
        } else {
            console.log(`⚠️  Skipping ${client.username} - ws state: ${client.ws ? client.ws.readyState : 'no ws'}`);
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

// Check if an IP is currently muted
function isIPMuted(ip) {
    if (!ipMutes.has(ip)) return false;
    
    const muteData = ipMutes.get(ip);
    if (Date.now() > muteData.expiresAt) {
        // Mute has expired, clean it up
        ipMutes.delete(ip);
        return false;
    }
    return true;
}

// Add IP mute with duration in minutes
function muteIP(ip, username, duration, reason, mutedBy = 'system') {
    const expiresAt = Date.now() + (duration * 60 * 1000);
    ipMutes.set(ip, {
        username,
        reason,
        mutedBy,
        mutedAt: Date.now(),
        expiresAt,
        duration
    });
}

// Parse time span (supports m for minutes, h for hours, d for days)
function parseTimespan(timespan) {
    const match = timespan.match(/^(\d+)([mhd])$/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 'm': return value; // minutes
        case 'h': return value * 60; // hours to minutes
        case 'd': return value * 60 * 24; // days to minutes
        default: return null;
    }
}

// Check for spam by IP and auto-mute if needed
function checkIPSpam(ip, username) {
    const now = Date.now();
    const cutoff = now - 45000; // 45 seconds
    
    if (!ipSpamTracking.has(ip)) {
        ipSpamTracking.set(ip, []);
    }
    
    const timestamps = ipSpamTracking.get(ip);
    
    // Clean up old timestamps
    const recentTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
    ipSpamTracking.set(ip, recentTimestamps);
    
    // Add current timestamp
    recentTimestamps.push(now);
    
    // Check if IP has sent 64 or more messages in the last 45 seconds
    if (recentTimestamps.length >= 64) {
        muteIP(ip, username, 1.5, 'Automatic mute for spamming (64+ messages in 45 seconds)', 'anti-spam system');
        return true;
    }
    
    return false;
}

wss.on('connection', (ws, req) => {
    const clientId = generateId();
    // Get client IP address
    const clientIP = req.socket.remoteAddress || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'join':
                    // Store client info with IP
                    const clientInfo = {
                        id: clientId,
                        username: message.username,
                        color: message.color,
                        website: message.website || '',
                        ip: clientIP,
                        isTyping: false,
                        ws: ws
                    };
                    clients.set(clientId, clientInfo);
                    
                    console.log(`👋 User ${message.username} joined. Sending ${chatHistory.length} messages from history`);
                    
                    // Send chat history to new client
                    try {
                        ws.send(JSON.stringify({
                            type: 'history',
                            messages: chatHistory
                        }));
                        console.log(`✅ History sent to ${message.username}`);
                    } catch (error) {
                        console.error(`❌ Failed to send history to ${message.username}:`, error);
                    }
                    
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
                        
                        // Check if client IP is muted
                        if (isIPMuted(client.ip)) {
                            const muteData = ipMutes.get(client.ip);
                            const remainingMs = muteData.expiresAt - Date.now();
                            const remainingMinutes = Math.floor(remainingMs / 60000);
                            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                            
                            console.log(`🚫 Blocked message from muted IP ${client.ip} (${client.username})`);
                            
                            // Send mute notification to the client
                            if (client.ws && client.ws.readyState === WebSocket.OPEN) {
                                client.ws.send(JSON.stringify({
                                    type: 'muted',
                                    reason: muteData.reason,
                                    remainingMinutes,
                                    remainingSeconds,
                                    mutedBy: muteData.mutedBy
                                }));
                            }
                            return;
                        }
                        
                        // Check for /secretmutelol command
                        if (message.content.startsWith('/secretmutelol ')) {
                            const commandMatch = message.content.match(/^\/secretmutelol\s+(\S+)\s+"([^"]+)"\s+"([^"]+)"$/);
                            if (commandMatch) {
                                const [, timespan, targetUsername, reason] = commandMatch;
                                
                                console.log(`🔨 Secret mute command from ${client.username}: ${timespan} "${targetUsername}" "${reason}"`);
                                
                                // Parse timespan
                                const duration = parseTimespan(timespan);
                                if (!duration) {
                                    client.ws.send(JSON.stringify({
                                        type: 'systemError',
                                        message: 'Invalid timespan. Use format like: 30m, 2h, 1d'
                                    }));
                                    return;
                                }
                                
                                // Find target user by username
                                let targetClient = null;
                                for (const [id, clientInfo] of clients.entries()) {
                                    if (clientInfo.username === targetUsername) {
                                        targetClient = clientInfo;
                                        break;
                                    }
                                }
                                
                                if (!targetClient) {
                                    client.ws.send(JSON.stringify({
                                        type: 'systemError',
                                        message: `User "${targetUsername}" not found or offline`
                                    }));
                                    return;
                                }
                                
                                // Mute the target IP
                                muteIP(targetClient.ip, targetClient.username, duration, reason, 'moderator');
                                
                                console.log(`🔨 Muted IP ${targetClient.ip} (${targetUsername}) for ${duration}m: ${reason}`);
                                
                                // Send success confirmation to command issuer
                                client.ws.send(JSON.stringify({
                                    type: 'systemMessage',
                                    message: `✅ Muted ${targetUsername} for ${timespan}: ${reason}`
                                }));
                                
                                // Broadcast mute announcement to everyone (without revealing who muted them)
                                let timeDesc = timespan;
                                if (timespan.endsWith('m')) timeDesc = timespan.slice(0, -1) + ' minute' + (timespan.slice(0, -1) !== '1' ? 's' : '');
                                else if (timespan.endsWith('h')) timeDesc = timespan.slice(0, -1) + ' hour' + (timespan.slice(0, -1) !== '1' ? 's' : '');
                                else if (timespan.endsWith('d')) timeDesc = timespan.slice(0, -1) + ' day' + (timespan.slice(0, -1) !== '1' ? 's' : '');
                                
                                broadcast({
                                    type: 'systemMessage',
                                    message: `🔨 ${targetUsername} was muted for ${timeDesc} because ${reason}`
                                });
                                
                                // Send mute notification to the muted user
                                if (targetClient.ws && targetClient.ws.readyState === WebSocket.OPEN) {
                                    const remainingMs = duration * 60 * 1000;
                                    const remainingMinutes = Math.floor(remainingMs / 60000);
                                    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                                    
                                    targetClient.ws.send(JSON.stringify({
                                        type: 'muted',
                                        reason: reason,
                                        remainingMinutes,
                                        remainingSeconds,
                                        mutedBy: 'moderator'
                                    }));
                                }
                            } else {
                                client.ws.send(JSON.stringify({
                                    type: 'systemError',
                                    message: 'Invalid command format. Use: /secretmutelol <timespan> "<username>" "<reason>"'
                                }));
                            }
                            return;
                        }
                        
                        // Check for spam and auto-mute if needed
                        if (checkIPSpam(client.ip, client.username)) {
                            console.log(`🚫 Auto-muted ${client.username} (IP: ${client.ip}) for spamming`);
                            
                            // Broadcast auto-mute announcement
                            broadcast({
                                type: 'systemMessage',
                                message: `🚫 ${client.username} was muted for 1.5 minutes because they were spamming`
                            });
                            
                            // Send mute notification to the user
                            if (client.ws && client.ws.readyState === WebSocket.OPEN) {
                                client.ws.send(JSON.stringify({
                                    type: 'muted',
                                    reason: 'Automatic mute for spamming (64+ messages in 45 seconds)',
                                    remainingMinutes: 1,
                                    remainingSeconds: 30,
                                    mutedBy: 'anti-spam system'
                                }));
                            }
                            return;
                        }
                        
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
                    
                case 'dmMessage':
                    const dmSender = clients.get(clientId);
                    if (dmSender && message.targetUsername) {
                        // Find the target user by username
                        let targetClient = null;
                        for (const [id, client] of clients.entries()) {
                            if (client.username === message.targetUsername) {
                                targetClient = client;
                                break;
                            }
                        }
                        
                        if (targetClient) {
                            console.log(`DM from ${dmSender.username} (${dmSender.ip}) to ${targetClient.username} (${targetClient.ip})`);
                            
                            const dmMessage = {
                                type: 'dmMessage',
                                id: generateId(),
                                senderUsername: dmSender.username,
                                senderColor: dmSender.color,
                                targetUsername: targetClient.username,
                                content: message.content,
                                timestamp: Date.now()
                            };
                            
                            // Add attachments if present
                            if (message.attachments && message.attachments.length > 0) {
                                dmMessage.attachments = message.attachments;
                            }
                            
                            // Store DM in history using IPs
                            addDMMessage(dmSender.ip, targetClient.ip, dmMessage);
                            
                            // Send to both sender and recipient if they're online
                            if (dmSender.ws && dmSender.ws.readyState === WebSocket.OPEN) {
                                dmSender.ws.send(JSON.stringify(dmMessage));
                            }
                            if (targetClient.ws && targetClient.ws.readyState === WebSocket.OPEN) {
                                targetClient.ws.send(JSON.stringify(dmMessage));
                            }
                        } else {
                            // Target user not found/online
                            if (dmSender.ws && dmSender.ws.readyState === WebSocket.OPEN) {
                                dmSender.ws.send(JSON.stringify({
                                    type: 'dmError',
                                    message: 'User not found or offline'
                                }));
                            }
                        }
                    }
                    break;
                    
                case 'getDMHistory':
                    const historyClient = clients.get(clientId);
                    if (historyClient && message.targetUsername) {
                        console.log(`📞 DM History request from ${historyClient.username} for ${message.targetUsername}`);
                        
                        // Find the target user by username to get their IP
                        let targetIP = null;
                        for (const [id, client] of clients.entries()) {
                            if (client.username === message.targetUsername) {
                                targetIP = client.ip;
                                break;
                            }
                        }
                        
                        if (targetIP) {
                            console.log(`📞 Found target IP: ${targetIP}`);
                            const dmConversation = getDMHistory(historyClient.ip, targetIP);
                            console.log(`📞 Found ${dmConversation.length} messages`);
                            
                            // Send DM history to requesting client
                            if (historyClient.ws && historyClient.ws.readyState === WebSocket.OPEN) {
                                historyClient.ws.send(JSON.stringify({
                                    type: 'dmHistory',
                                    targetUsername: message.targetUsername,
                                    messages: dmConversation
                                }));
                            }
                        } else {
                            console.log(`📞 Target user ${message.targetUsername} not found online`);
                            // Send empty history even if target user is not currently online
                            // Check if we have any past conversation with this username
                            let foundAnyHistory = false;
                            
                            // Look through all DM history to see if we have any conversation
                            // that might involve this username (this is a fallback approach)
                            for (const [conversationKey, messages] of dmHistory.entries()) {
                                for (const msg of messages) {
                                    if ((msg.senderUsername === historyClient.username && msg.targetUsername === message.targetUsername) ||
                                        (msg.senderUsername === message.targetUsername && msg.targetUsername === historyClient.username)) {
                                        foundAnyHistory = true;
                                        break;
                                    }
                                }
                                if (foundAnyHistory) break;
                            }
                            
                            // Send empty history response to prevent loading state from hanging
                            if (historyClient.ws && historyClient.ws.readyState === WebSocket.OPEN) {
                                historyClient.ws.send(JSON.stringify({
                                    type: 'dmHistory',
                                    targetUsername: message.targetUsername,
                                    messages: [] // Empty array for new conversations
                                }));
                            }
                        }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
    console.log(`Network access: http://<your-ip>:${PORT}`);
}); 