const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');

// Import the new categorized logger
const { logEvent, logChatMessage, logDMMessage, logMessageEdit, logMessageDelete } = require('./logger');

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
const bannedIPs = new Set(); // Store banned IP addresses
const bannedFingerprints = new Set(); // Store banned device fingerprints
const fingerprintToIPs = new Map(); // Track which IPs a fingerprint has used
const ipToFingerprint = new Map(); // Track which fingerprint an IP is using
const userSessions = new Map(); // Track active user sessions by fingerprint+username
const MAX_MESSAGES = 128;
const MAX_DM_MESSAGES = 512; // Separate limit for DM conversations

// Helper function to get real IP address (handles proxies/load balancers)
function getRealIP(req) {
    return req.headers['cf-connecting-ip'] || // Cloudflare
           req.headers['x-real-ip'] || // Nginx
           req.headers['x-forwarded-for']?.split(',')[0] || // Standard proxy header
           req.socket.remoteAddress || 
           req.connection.remoteAddress || 
           'unknown';
}

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
    
    clients.forEach((client, clientId) => {
        if (client.ws && client.ws !== excludeClient && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageString);
            } catch (error) {
                console.error(`❌ Error sending message to ${client.username}:`, error);
                // Remove broken client connection
                clients.delete(clientId);
            }
        }
    });
}

// Get list of online users
function getOnlineUsers() {
    const users = Array.from(clients.values()).map(client => ({
        id: client.id,
        username: client.username,
        color: client.color,
        website: client.website || '',
        isTabbed: client.isTabbed || false
    }));
    return users;
}

// Process join request (called after fingerprint verification)
function processJoin(clientId, joinMessage) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // Check if this fingerprint + username combination already has an active session
    const wasSessionTakeover = createUserSession(clientId, client.fingerprint, joinMessage.username, client);
    
    // Log the join event with IP
    logEvent('JOIN', joinMessage.username, client.ip, `Color: ${joinMessage.color}${wasSessionTakeover ? ' (session takeover)' : ''}`);
    
    // Update client info with join data
    client.username = joinMessage.username;
    client.color = joinMessage.color;
    client.website = joinMessage.website || '';
    client.isTyping = false;
    client.isTabbed = false; // Initialize as not tabbed when joining
    
    console.log(`👋 User ${joinMessage.username} joined${wasSessionTakeover ? ' (took over existing session)' : ''}. Sending ${chatHistory.length} messages from history`);
    
    // Send chat history to new client
    try {
        client.ws.send(JSON.stringify({
            type: 'history',
            messages: chatHistory
        }));
        console.log(`✅ History sent to ${joinMessage.username}`);
    } catch (error) {
        console.error(`❌ Failed to send history to ${joinMessage.username}:`, error);
    }
    
    // Send session takeover notification if applicable
    if (wasSessionTakeover) {
        try {
            client.ws.send(JSON.stringify({
                type: 'sessionTakeover',
                message: 'Your previous session was disconnected because you connected from another tab or window.'
            }));
        } catch (error) {
            console.error(`❌ Failed to send session takeover notification to ${joinMessage.username}:`, error);
        }
    }
    
    // Send updated user list to all clients
    broadcast({
        type: 'userList',
        users: getOnlineUsers(),
        count: clients.size
    });
    
    // Notify others about new user (only if not a takeover)
    if (!wasSessionTakeover) {
        broadcast({
            type: 'userJoined',
            username: joinMessage.username,
            color: joinMessage.color
        }, client.ws);
    }
}

wss.on('connection', (ws, req) => {
    const clientId = generateId();
    // Get client IP address
    const clientIP = getRealIP(req);
    
    // Check if IP is banned before allowing connection
    if (isIPBanned(clientIP)) {
        logEvent('BANNED_IP_ATTEMPT', 'unknown', clientIP, 'Connection rejected - IP is banned');
        ws.close(1008, 'Your IP address has been banned from this server');
        return;
    }
    
    // Log the initial connection
    logEvent('CONNECTION', 'connecting...', clientIP, `Client ID: ${clientId}`);
    
    // Store temporary client info immediately for fingerprint checking
    const tempClientInfo = {
        id: clientId,
        ip: clientIP,
        ws: ws,
        fingerprintVerified: false,
        joinRequested: false
    };
    clients.set(clientId, tempClientInfo);
    
    // Request device fingerprint from client
    ws.send(JSON.stringify({
        type: 'requestFingerprint'
    }));
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'fingerprint':
                    const fingerprintClient = clients.get(clientId);
                    if (fingerprintClient && message.fingerprint) {
                        const clientIP = fingerprintClient.ip;
                        const fingerprint = message.fingerprint;
                        
                        // Log fingerprint received
                        logEvent('FINGERPRINT_RECEIVED', 'connecting...', clientIP, `Fingerprint: ${fingerprint}`);
                        
                        // Check for ban evasion
                        const wasAutoBanned = trackFingerprint(clientIP, fingerprint);
                        
                        if (wasAutoBanned || isFingerprintBanned(fingerprint)) {
                            logEvent('BAN_EVASION_BLOCKED', 'unknown', clientIP, `Connection rejected - banned fingerprint: ${fingerprint}`);
                            if (fingerprintClient.ws && fingerprintClient.ws.readyState === WebSocket.OPEN) {
                                fingerprintClient.ws.close(1008, 'Your device has been banned from this server');
                            }
                            clients.delete(clientId);
                            return;
                        }
                        
                        // Store fingerprint with client and mark as verified
                        fingerprintClient.fingerprint = fingerprint;
                        fingerprintClient.fingerprintVerified = true;
                        
                        logEvent('FINGERPRINT_TRACKED', 'connecting...', clientIP, `Fingerprint stored: ${fingerprint}`);
                        
                        // If they already tried to join, process it now
                        if (fingerprintClient.joinRequested && fingerprintClient.pendingJoinData) {
                            const joinData = fingerprintClient.pendingJoinData;
                            delete fingerprintClient.pendingJoinData;
                            delete fingerprintClient.joinRequested;
                            
                            // Process the join now that fingerprint is verified
                            processJoin(clientId, joinData);
                        }
                    }
                    break;
                    
                case 'join':
                    const joinClient = clients.get(clientId);
                    if (joinClient) {
                        // Check if fingerprint has been verified
                        if (!joinClient.fingerprintVerified) {
                            // Store join request for later processing
                            joinClient.joinRequested = true;
                            joinClient.pendingJoinData = message;
                            logEvent('JOIN_DEFERRED', message.username, joinClient.ip, 'Waiting for fingerprint verification');
                            return;
                        }
                        
                        // Process join immediately if fingerprint is already verified
                        processJoin(clientId, message);
                    }
                    break;
                    
                case 'message':
                    const messageClient = clients.get(clientId);
                    if (messageClient) {
                        // Check if message is a ban/unban command
                        if (message.content.startsWith('/pb ') || message.content.startsWith('/unpb ') || 
                            message.content.startsWith('/pbf ') || message.content.startsWith('/unpbf ')) {
                            const commandResult = processCommand(message.content, messageClient);
                            if (commandResult) {
                                // Send command result back to the user
                                if (messageClient.ws && messageClient.ws.readyState === WebSocket.OPEN) {
                                    messageClient.ws.send(JSON.stringify({
                                        type: 'systemMessage',
                                        message: commandResult.message
                                    }));
                                }
                                // Don't broadcast the command as a regular message
                                break;
                            }
                        }
                        
                        // Log the message with new categorized logger
                        if (message.content) {
                            const replyContent = message.replyTo ? message.replyTo.content : null;
                            logChatMessage(
                                messageClient.username, 
                                message.content, 
                                message.attachments?.length || 0,
                                replyContent
                            );
                        }
                        
                        // Log the message event with IP
                        
                        console.log('Received message from', messageClient.username);
                        console.log('Message content:', message.content);
                        console.log('Message attachments:', message.attachments);
                        console.log('Reply data:', message.replyTo);
                        
                        const chatMessage = {
                            type: 'message',
                            id: generateId(),
                            username: messageClient.username,
                            color: messageClient.color,
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
                            // Log the DM with new categorized logger
                            logDMMessage(dmSender.username, targetClient.username, message.content);
                            
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
                            // Log failed DM attempt
                            logEvent('DM_FAILED', dmSender.username, dmSender.ip, `Target not found: ${message.targetUsername}`);
                            
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
                        // Log the DM history request with IP
                        logEvent('DM_HISTORY_REQUEST', historyClient.username, historyClient.ip, `Requesting history with: ${message.targetUsername}`);
                        
                        console.log(`📞 DM History request from ${historyClient.username} for ${message.targetUsername}`);
                        
                        // Find the target user by username to get their IP
                        let targetIP = null;
                        for (const [id, client] of clients.entries()) {
                            if (client.username === message.targetUsername) {
                                targetIP = client.ip;
                                break;
                            }
                        }
                        
                        let dmConversation = [];
                        
                        if (targetIP) {
                            console.log(`📞 Found target IP: ${targetIP}`);
                            dmConversation = getDMHistory(historyClient.ip, targetIP);
                            console.log(`📞 Found ${dmConversation.length} messages`);
                        } else {
                            console.log(`📞 Target user ${message.targetUsername} not found online - no conversation available`);
                            // For privacy and security, we do NOT search through other conversations
                            // If the target user is not online, we simply return empty history
                            // This prevents potential privacy leaks where users might see conversations
                            // from different IP addresses that happen to use the same username
                            dmConversation = [];
                        }
                        
                        // Always send a response to prevent loading state from hanging
                        if (historyClient.ws && historyClient.ws.readyState === WebSocket.OPEN) {
                            historyClient.ws.send(JSON.stringify({
                                type: 'dmHistory',
                                targetUsername: message.targetUsername,
                                messages: dmConversation
                            }));
                        }
                    }
                    break;
                    
                case 'typing':
                    const typingClient = clients.get(clientId);
                    if (typingClient) {
                        // Log typing events (only when starting to type to reduce spam)
                        if (message.isTyping) {
                            logEvent('TYPING_START', typingClient.username, typingClient.ip);
                        }
                        
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
                        // Log the user update with IP
                        logEvent('USER_UPDATE', updateClient.username, updateClient.ip, `New username: ${message.username}, New color: ${message.color}`);
                        
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
                        // Don't log cursor movements as they're too frequent
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
                    
                case 'tabbedStatus':
                    const tabbedClient = clients.get(clientId);
                    if (tabbedClient) {
                        // Update tabbed status
                        tabbedClient.isTabbed = message.isTabbed;
                        
                        // Broadcast updated user list to all clients
                        broadcast({
                            type: 'userList',
                            users: getOnlineUsers(),
                            count: clients.size
                        });
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
                                // Log the edit with new categorized logger
                                logMessageEdit(editClient.username, originalMessage.content, message.newContent);
                                
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
                                logEvent('EDIT_DENIED', editClient.username, editClient.ip, `Attempted to edit message from: ${originalMessage.username}`);
                            }
                        } else {
                            console.log('🔧 Message not found in history');
                            logEvent('EDIT_FAILED', editClient.username, editClient.ip, `Message ID not found: ${message.messageId}`);
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
                                // Log the deletion with new categorized logger
                                logMessageDelete(deleteClient.username, originalMessage.content);
                                
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
                                logEvent('DELETE_DENIED', deleteClient.username, deleteClient.ip, `Attempted to delete message from: ${originalMessage.username}`);
                            }
                        } else {
                            console.log('🔧 Message not found in history');
                            logEvent('DELETE_FAILED', deleteClient.username, deleteClient.ip, `Message ID not found: ${message.messageId}`);
                        }
                    } else {
                        console.log('🔧 Delete client not found');
                    }
                    break;
                    
                case 'systemMessage':
                    const systemClient = clients.get(clientId);
                    if (systemClient) {
                        // Log system message with IP (could be admin command)
                        logEvent('SYSTEM_MESSAGE', systemClient.username, systemClient.ip, `Message: ${message.message}`);
                    }
                    
                    // Broadcast system message to all clients
                    broadcast({
                        type: 'systemMessage',
                        message: message.message
                    });
                    break;
                    
                case 'fakeMessage':
                    const fakeMessageClient = clients.get(clientId);
                    if (fakeMessageClient) {
                        // Log fake message creation with IP (could be admin/mod command)
                        logEvent('FAKE_MESSAGE', fakeMessageClient.username, fakeMessageClient.ip, `Fake user: ${message.username}, Message: ${message.message}`);
                    }
                    
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
                    const fakeConnectClient = clients.get(clientId);
                    if (fakeConnectClient) {
                        // Log fake user connection with IP
                        logEvent('FAKE_CONNECT', fakeConnectClient.username, fakeConnectClient.ip, `Creating fake user: ${message.username} (${message.color})`);
                    }
                    
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
                    const fakeDisconnectClient = clients.get(clientId);
                    if (fakeDisconnectClient) {
                        // Log fake user disconnection with IP
                        logEvent('FAKE_DISCONNECT', fakeDisconnectClient.username, fakeDisconnectClient.ip, `Removing fake user: ${message.username}`);
                    }
                    
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
                    
                case '/pbf':
                    if (parts.length < 2) {
                        return { 
                            type: 'error', 
                            message: 'Usage: /pbf <fingerprint>' 
                        };
                    }
                    
                    const fingerprintToBan = parts[1];
                    
                    if (isFingerprintBanned(fingerprintToBan)) {
                        return { 
                            type: 'error', 
                            message: `Fingerprint ${fingerprintToBan} is already banned` 
                        };
                    }
                    
                    // Ban the fingerprint and all associated IPs
                    bannedFingerprints.add(fingerprintToBan);
                    logEvent('FINGERPRINT_BAN_COMMAND', client.username, client.ip, `Banned fingerprint: ${fingerprintToBan}`);
                    
                    // Ban all IPs associated with this fingerprint
                    const associatedIPs = fingerprintToIPs.get(fingerprintToBan) || new Set();
                    let bannedCount = 0;
                    associatedIPs.forEach(ip => {
                        if (!bannedIPs.has(ip)) {
                            bannedIPs.add(ip);
                            bannedCount++;
                            logEvent('IP_BANNED_BY_FINGERPRINT_CMD', client.username, client.ip, `Auto-banned IP: ${ip} (fingerprint: ${fingerprintToBan})`);
                        }
                    });
                    
                    // Disconnect any currently connected clients with this fingerprint
                    const clientsToDisconnect = [];
                    clients.forEach((connectedClient, clientId) => {
                        if (connectedClient.fingerprint === fingerprintToBan) {
                            clientsToDisconnect.push({ clientId, client: connectedClient });
                        }
                    });
                    
                    clientsToDisconnect.forEach(({ clientId, client: connectedClient }) => {
                        logEvent('FINGERPRINT_BAN_DISCONNECT', connectedClient.username, connectedClient.ip, 'Disconnected due to fingerprint ban');
                        if (connectedClient.ws && connectedClient.ws.readyState === WebSocket.OPEN) {
                            connectedClient.ws.close(1008, 'Device fingerprint banned');
                        }
                        clients.delete(clientId);
                    });
                    
                    // Update user list if anyone was disconnected
                    if (clientsToDisconnect.length > 0) {
                        broadcast({
                            type: 'userList',
                            users: getOnlineUsers(),
                            count: clients.size
                        });
                    }
                    
                    return { 
                        type: 'success', 
                        message: `Successfully banned fingerprint: ${fingerprintToBan} (${bannedCount} IPs auto-banned, ${clientsToDisconnect.length} clients disconnected)` 
                    };
                    
                case '/unpbf':
                    if (parts.length < 2) {
                        return { 
                            type: 'error', 
                            message: 'Usage: /unpbf <fingerprint>' 
                        };
                    }
                    
                    const fingerprintToUnban = parts[1];
                    const wasFingerprintBanned = bannedFingerprints.has(fingerprintToUnban);
                    bannedFingerprints.delete(fingerprintToUnban);
                    
                    logEvent('FINGERPRINT_UNBAN_COMMAND', client.username, client.ip, `Unbanned fingerprint: ${fingerprintToUnban}`);
                    
                    if (wasFingerprintBanned) {
                        return { 
                            type: 'success', 
                            message: `Successfully unbanned fingerprint: ${fingerprintToUnban}` 
                        };
                    } else {
                        return { 
                            type: 'error', 
                            message: `Fingerprint ${fingerprintToUnban} was not banned` 
                        };
                    }
                    
                default:
                    const unknownEventClient = clients.get(clientId);
                    if (unknownEventClient) {
                        // Log unknown events with IP
                        logEvent('UNKNOWN_EVENT', unknownEventClient.username, unknownEventClient.ip, `Event type: ${message.type}`);
                    }
                    break;
            }
        } catch (error) {
            const errorClient = clients.get(clientId);
            if (errorClient) {
                logEvent('PARSE_ERROR', errorClient.username, errorClient.ip, `Error: ${error.message}`);
            }
            console.error('Error parsing message:', error);
        }
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
        const client = clients.get(clientId);
        if (client && client.username) {
            console.log(`👋 User ${client.username} disconnected (code: ${code}, reason: ${reason || 'none'})`);
            logEvent('LEAVE', client.username, client.ip, 'Disconnected');
            
            // Remove from user session tracking
            removeUserSession(clientId);
            
            // Clear any typing indicator
            client.isTyping = false;
            
            // Notify others about user leaving
            broadcast({
                type: 'userLeft',
                username: client.username
            }, ws);
        } else {
            console.log(`🔗 Anonymous client disconnected (code: ${code})`);
        }
        
        // Remove client from tracking
        clients.delete(clientId);
        
        // Send updated user list
        broadcast({
            type: 'userList',
            users: getOnlineUsers(),
            count: clients.size
        });
    });
});

// IP Ban management functions
function banIP(ip, bannedBy) {
    bannedIPs.add(ip);
    logEvent('IP_BANNED', bannedBy, 'SERVER', `Banned IP: ${ip}`);
    
    // Also ban the device fingerprint associated with this IP
    const fingerprint = ipToFingerprint.get(ip);
    if (fingerprint) {
        bannedFingerprints.add(fingerprint);
        logEvent('FINGERPRINT_BANNED', bannedBy, 'SERVER', `Banned fingerprint: ${fingerprint} (from IP: ${ip})`);
        
        // Ban all other IPs associated with this fingerprint
        const associatedIPs = fingerprintToIPs.get(fingerprint) || new Set();
        associatedIPs.forEach(associatedIP => {
            if (associatedIP !== ip && !bannedIPs.has(associatedIP)) {
                bannedIPs.add(associatedIP);
                logEvent('IP_BANNED_BY_FINGERPRINT', bannedBy, 'SERVER', `Auto-banned IP: ${associatedIP} (same fingerprint as ${ip})`);
            }
        });
    }
    
    // Disconnect any currently connected clients with this IP or fingerprint
    const clientsToDisconnect = [];
    clients.forEach((client, clientId) => {
        if (client.ip === ip || (client.fingerprint && bannedFingerprints.has(client.fingerprint))) {
            clientsToDisconnect.push({ clientId, client });
        }
    });
    
    clientsToDisconnect.forEach(({ clientId, client }) => {
        logEvent('IP_BAN_DISCONNECT', client.username, client.ip, 'Disconnected due to IP/fingerprint ban');
        if (client.ws && client.ws.readyState === WebSocket.OPEN) {
            client.ws.close(1008, 'IP or device banned');
        }
        clients.delete(clientId);
    });
    
    // Update user list if anyone was disconnected
    if (clientsToDisconnect.length > 0) {
        broadcast({
            type: 'userList',
            users: getOnlineUsers(),
            count: clients.size
        });
    }
}

function unbanIP(ip, unbannedBy) {
    const wasBanned = bannedIPs.has(ip);
    bannedIPs.delete(ip);
    
    // Also unban the fingerprint if this was the last IP for that fingerprint
    const fingerprint = ipToFingerprint.get(ip);
    if (fingerprint && bannedFingerprints.has(fingerprint)) {
        const associatedIPs = fingerprintToIPs.get(fingerprint) || new Set();
        const stillBannedIPs = Array.from(associatedIPs).filter(associatedIP => bannedIPs.has(associatedIP));
        
        if (stillBannedIPs.length === 0) {
            bannedFingerprints.delete(fingerprint);
            logEvent('FINGERPRINT_UNBANNED', unbannedBy, 'SERVER', `Unbanned fingerprint: ${fingerprint} (no more banned IPs)`);
        }
    }
    
    if (wasBanned) {
        logEvent('IP_UNBANNED', unbannedBy, 'SERVER', `Unbanned IP: ${ip}`);
        return true;
    }
    return false;
}

function isIPBanned(ip) {
    return bannedIPs.has(ip);
}

function isFingerprintBanned(fingerprint) {
    return bannedFingerprints.has(fingerprint);
}

// Track device fingerprint and detect ban evasion
function trackFingerprint(ip, fingerprint) {
    // Store the mapping
    ipToFingerprint.set(ip, fingerprint);
    
    if (!fingerprintToIPs.has(fingerprint)) {
        fingerprintToIPs.set(fingerprint, new Set());
    }
    fingerprintToIPs.get(fingerprint).add(ip);
    
    // Check for ban evasion
    if (bannedFingerprints.has(fingerprint)) {
        // This fingerprint is banned, auto-ban this new IP
        bannedIPs.add(ip);
        logEvent('BAN_EVASION_DETECTED', 'SYSTEM', ip, `Auto-banned IP for banned fingerprint: ${fingerprint}`);
        return true; // Indicates this IP was auto-banned
    }
    
    return false; // Not banned
}

// Session management functions
function getSessionKey(fingerprint, username) {
    return `${fingerprint}:${username.toLowerCase()}`;
}

function checkExistingSession(fingerprint, username) {
    const sessionKey = getSessionKey(fingerprint, username);
    return userSessions.get(sessionKey);
}

function createUserSession(clientId, fingerprint, username, clientInfo) {
    const sessionKey = getSessionKey(fingerprint, username);
    
    // Check if there's already an active session
    const existingSession = userSessions.get(sessionKey);
    if (existingSession) {
        // Disconnect the old session
        const oldClient = clients.get(existingSession.clientId);
        if (oldClient && oldClient.ws && oldClient.ws.readyState === WebSocket.OPEN) {
            logEvent('SESSION_TAKEOVER', username, clientInfo.ip, `Disconnecting old session: ${existingSession.clientId}`);
            oldClient.ws.close(1000, 'Your session has been taken over by another connection');
        }
        clients.delete(existingSession.clientId);
        
        // Notify others about the user leaving (from old session)
        broadcast({
            type: 'userLeft',
            username: username
        });
    }
    
    // Create new session
    const sessionInfo = {
        clientId: clientId,
        fingerprint: fingerprint,
        username: username,
        ip: clientInfo.ip,
        connectedAt: Date.now()
    };
    
    userSessions.set(sessionKey, sessionInfo);
    logEvent('SESSION_CREATED', username, clientInfo.ip, `Session key: ${sessionKey}`);
    
    return existingSession !== undefined; // Return true if this was a takeover
}

function removeUserSession(clientId) {
    // Find and remove session by clientId
    for (const [sessionKey, sessionInfo] of userSessions.entries()) {
        if (sessionInfo.clientId === clientId) {
            userSessions.delete(sessionKey);
            logEvent('SESSION_REMOVED', sessionInfo.username, sessionInfo.ip, `Session key: ${sessionKey}`);
            return sessionInfo;
        }
    }
    return null;
}

// Process chat commands (for /pb and /unpb)
function processCommand(content, client) {
    const parts = content.trim().split(' ');
    const command = parts[0].toLowerCase();
    
    switch (command) {
        case '/pb':
            if (parts.length < 2) {
                return { 
                    type: 'error', 
                    message: 'Usage: /pb <ip_address>' 
                };
            }
            
            const ipToBan = parts[1];
            // Basic IP validation
            if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipToBan) && ipToBan !== 'unknown') {
                return { 
                    type: 'error', 
                    message: 'Invalid IP address format' 
                };
            }
            
            if (isIPBanned(ipToBan)) {
                return { 
                    type: 'error', 
                    message: `IP ${ipToBan} is already banned` 
                };
            }
            
            banIP(ipToBan, client.username);
            logEvent('BAN_COMMAND', client.username, client.ip, `Banned IP: ${ipToBan}`);
            
            return { 
                type: 'success', 
                message: `Successfully banned IP: ${ipToBan}` 
            };
            
        case '/unpb':
            if (parts.length < 2) {
                return { 
                    type: 'error', 
                    message: 'Usage: /unpb <ip_address>' 
                };
            }
            
            const ipToUnban = parts[1];
            // Basic IP validation
            if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipToUnban) && ipToUnban !== 'unknown') {
                return { 
                    type: 'error', 
                    message: 'Invalid IP address format' 
                };
            }
            
            const wasUnbanned = unbanIP(ipToUnban, client.username);
            logEvent('UNBAN_COMMAND', client.username, client.ip, `Unbanned IP: ${ipToUnban}`);
            
            if (wasUnbanned) {
                return { 
                    type: 'success', 
                    message: `Successfully unbanned IP: ${ipToUnban}` 
                };
            } else {
                return { 
                    type: 'error', 
                    message: `IP ${ipToUnban} was not banned` 
                };
            }
            
        case '/pbf':
            if (parts.length < 2) {
                return { 
                    type: 'error', 
                    message: 'Usage: /pbf <fingerprint>' 
                };
            }
            
            const fingerprintToBan = parts[1];
            
            if (isFingerprintBanned(fingerprintToBan)) {
                return { 
                    type: 'error', 
                    message: `Fingerprint ${fingerprintToBan} is already banned` 
                };
            }
            
            // Ban the fingerprint and all associated IPs
            bannedFingerprints.add(fingerprintToBan);
            logEvent('FINGERPRINT_BAN_COMMAND', client.username, client.ip, `Banned fingerprint: ${fingerprintToBan}`);
            
            // Ban all IPs associated with this fingerprint
            const associatedIPs = fingerprintToIPs.get(fingerprintToBan) || new Set();
            let bannedCount = 0;
            associatedIPs.forEach(ip => {
                if (!bannedIPs.has(ip)) {
                    bannedIPs.add(ip);
                    bannedCount++;
                    logEvent('IP_BANNED_BY_FINGERPRINT_CMD', client.username, client.ip, `Auto-banned IP: ${ip} (fingerprint: ${fingerprintToBan})`);
                }
            });
            
            // Disconnect any currently connected clients with this fingerprint
            const clientsToDisconnect = [];
            clients.forEach((connectedClient, clientId) => {
                if (connectedClient.fingerprint === fingerprintToBan) {
                    clientsToDisconnect.push({ clientId, client: connectedClient });
                }
            });
            
            clientsToDisconnect.forEach(({ clientId, client: connectedClient }) => {
                logEvent('FINGERPRINT_BAN_DISCONNECT', connectedClient.username, connectedClient.ip, 'Disconnected due to fingerprint ban');
                if (connectedClient.ws && connectedClient.ws.readyState === WebSocket.OPEN) {
                    connectedClient.ws.close(1008, 'Device fingerprint banned');
                }
                clients.delete(clientId);
            });
            
            // Update user list if anyone was disconnected
            if (clientsToDisconnect.length > 0) {
                broadcast({
                    type: 'userList',
                    users: getOnlineUsers(),
                    count: clients.size
                });
            }
            
            return { 
                type: 'success', 
                message: `Successfully banned fingerprint: ${fingerprintToBan} (${bannedCount} IPs auto-banned, ${clientsToDisconnect.length} clients disconnected)` 
            };
            
        case '/unpbf':
            if (parts.length < 2) {
                return { 
                    type: 'error', 
                    message: 'Usage: /unpbf <fingerprint>' 
                };
            }
            
            const fingerprintToUnban = parts[1];
            const wasFingerprintBanned = bannedFingerprints.has(fingerprintToUnban);
            bannedFingerprints.delete(fingerprintToUnban);
            
            logEvent('FINGERPRINT_UNBAN_COMMAND', client.username, client.ip, `Unbanned fingerprint: ${fingerprintToUnban}`);
            
            if (wasFingerprintBanned) {
                return { 
                    type: 'success', 
                    message: `Successfully unbanned fingerprint: ${fingerprintToUnban}` 
                };
            } else {
                return { 
                    type: 'error', 
                    message: `Fingerprint ${fingerprintToUnban} was not banned` 
                };
            }
            
        default:
            return null; // Not a recognized command
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
    console.log(`Network access: http://<your-ip>:${PORT}`);
}); 
