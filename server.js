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
const bannedIPs = new Set(); // Store banned IP addresses
const bannedFingerprints = new Set(); // Store banned device fingerprints
const fingerprintToIPs = new Map(); // Track which IPs a fingerprint has used
const ipToFingerprint = new Map(); // Track which fingerprint an IP is using
const MAX_MESSAGES = 128;
const MAX_DM_MESSAGES = 512; // Separate limit for DM conversations

// Store fingerprint history for analysis
const fingerprintHistory = new Map(); // IP -> Array of {fingerprint, timestamp}

// Helper function to get real IP address (handles proxies/load balancers)
function getRealIP(req) {
    return req.headers['cf-connecting-ip'] || // Cloudflare
           req.headers['x-real-ip'] || // Nginx
           req.headers['x-forwarded-for']?.split(',')[0] || // Standard proxy header
           req.socket.remoteAddress || 
           req.connection.remoteAddress || 
           'unknown';
}

// Helper function to format IP logging with timestamp
function logEvent(eventType, username, ip, details = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🌐 ${eventType} | IP: ${ip} | User: ${username || 'unknown'} ${details ? '| ' + details : ''}`);
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
        website: client.website || ''
    }));
    return users;
}

// Process join request (called after fingerprint verification)
function processJoin(clientId, joinMessage) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // Log the join event with IP
    logEvent('JOIN', joinMessage.username, client.ip, `Color: ${joinMessage.color}`);
    
    // Update client info with join data
    client.username = joinMessage.username;
    client.color = joinMessage.color;
    client.website = joinMessage.website || '';
    client.isTyping = false;
    
    console.log(`👋 User ${joinMessage.username} joined. Sending ${chatHistory.length} messages from history`);
    
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
    
    // Send updated user list to all clients
    broadcast({
        type: 'userList',
        users: getOnlineUsers(),
        count: clients.size
    });
    
    // Notify others about new user
    broadcast({
        type: 'userJoined',
        username: joinMessage.username,
        color: joinMessage.color
    }, client.ws);
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
                    const fingerprint = message.fingerprint;
                    const components = message.components || [];
                    const realIPData = message.realIPData || {};
                    
                    if (!fingerprint) {
                        logEvent('FINGERPRINT_ERROR', 'SYSTEM', clientIP, 'No fingerprint provided');
                        ws.close(1008, 'Invalid fingerprint');
                        return;
                    }
                    
                    // Log VPN detection if found
                    if (realIPData.isVPN) {
                        logVPNDetection(realIPData.vpnIP, realIPData.realIP, message.username, clientIP);
                    }
                    
                    // Store fingerprint components for future analysis
                    storeFingerprintComponents(fingerprint, components);
                    
                    // Check if this fingerprint is banned
                    if (isFingerprintBanned(fingerprint)) {
                        logEvent('BANNED_FINGERPRINT_DETECTED', 'SYSTEM', clientIP, `Fingerprint: ${fingerprint}`);
                        ws.close(1008, 'Access denied');
                        return;
                    }
                    
                    // Detect partial fingerprint manipulation
                    const partialManipulationScore = detectPartialFingerprintManipulation(clientIP, fingerprint);
                    
                    // Track and analyze the fingerprint
                    const trackingResult = trackFingerprint(clientIP, fingerprint, partialManipulationScore);
                    
                    // If auto-banned due to suspicious activity, close connection
                    if (trackingResult && trackingResult.autoBanned) {
                        logEvent('AUTO_BANNED_FINGERPRINT', 'SYSTEM', clientIP, `Fingerprint: ${fingerprint}, Reason: ${trackingResult.reason}`);
                        ws.close(1008, 'Access denied - suspicious activity detected');
                        return;
                    }
                    
                    // Store verified fingerprint
                    const currentClient = clients.get(clientId);
                    if (currentClient) {
                        currentClient.fingerprint = fingerprint;
                        currentClient.fingerprintVerified = true;
                        currentClient.realIPData = realIPData;
                        clients.set(clientId, currentClient);
                    }
                    
                    // Add fingerprint to history for analysis
                    addFingerprintToHistory(clientIP, fingerprint);
                    
                    logEvent('FINGERPRINT_STORED', 'SYSTEM', clientIP, `Fingerprint: ${fingerprint}`);
                    
                    // Process any pending join request now that fingerprint is verified
                    if (currentClient && currentClient.pendingJoinData) {
                        const joinData = currentClient.pendingJoinData;
                        currentClient.pendingJoinData = null;
                        clients.set(clientId, currentClient);
                        
                        // Process the join request
                        processJoin(clientId, joinData);
                    }
                    break;
                    
                case 'vpnDetection':
                    const vpnClient = clients.get(clientId);
                    if (vpnClient) {
                        logVPNDetection(message.vpnIP, message.realIP, message.username, vpnClient.ip);
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
                        
                        // Log the message event with IP
                        logEvent('MESSAGE', messageClient.username, messageClient.ip, `Content length: ${message.content?.length || 0} chars, Attachments: ${message.attachments?.length || 0}`);
                        
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
                            // Log the DM event with both IPs
                            logEvent('DM_MESSAGE', dmSender.username, dmSender.ip, `To: ${targetClient.username} (${targetClient.ip}), Content length: ${message.content?.length || 0} chars`);
                            
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
                    
                case 'editMessage':
                    console.log('🔧 Server received editMessage:', message);
                    const editClient = clients.get(clientId);
                    if (editClient) {
                        // Log the edit attempt with IP
                        logEvent('EDIT_MESSAGE', editClient.username, editClient.ip, `Message ID: ${message.messageId}, New content length: ${message.newContent?.length || 0} chars`);
                        
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
                                logEvent('EDIT_SUCCESS', editClient.username, editClient.ip, `Message ID: ${message.messageId} edited successfully`);
                                
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
                        // Log the delete attempt with IP
                        logEvent('DELETE_MESSAGE', deleteClient.username, deleteClient.ip, `Message ID: ${message.messageId}`);
                        
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
                                logEvent('DELETE_SUCCESS', deleteClient.username, deleteClient.ip, `Message ID: ${message.messageId} deleted successfully`);
                                
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
    
    ws.on('close', () => {
        const client = clients.get(clientId);
        if (client) {
            // Log the disconnection with IP
            logEvent('DISCONNECT', client.username, client.ip, `Client ID: ${clientId}`);
            
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

// Enhanced fingerprint tracking with spoofing detection
function trackFingerprint(ip, fingerprint, partialManipulationScore) {
    // Store the mapping
    ipToFingerprint.set(ip, fingerprint);
    
    if (!fingerprintToIPs.has(fingerprint)) {
        fingerprintToIPs.set(fingerprint, new Set());
    }
    fingerprintToIPs.get(fingerprint).add(ip);
    
    // Analyze the fingerprint
    const indicators = analyzeFingerprint(fingerprint, ip, partialManipulationScore);
    
    if (indicators.length > 0) {
        logEvent('FINGERPRINT_SUSPICIOUS', 'SYSTEM', ip, `Indicators: ${indicators.join(', ')} | Fingerprint: ${fingerprint}`);
        
        // If multiple high-risk indicators, treat as potential spoofing
        const highRiskIndicators = indicators.filter(indicator => 
            indicator.includes('SPOOF') || indicator.includes('FAKE') || indicator.includes('INCONSISTENT') || 
            indicator.includes('PARTIAL_MANIPULATION') || indicator.includes('SELECTIVE_CHANGE')
        );
        
        if (highRiskIndicators.length >= 2) {
            // Auto-ban suspected spoofed fingerprints
            bannedFingerprints.add(fingerprint);
            bannedIPs.add(ip);
            logEvent('AUTO_BAN_SPOOFING', 'SYSTEM', ip, `Suspected fingerprint spoofing detected. Auto-banned fingerprint: ${fingerprint}`);
            return { autoBanned: true, reason: 'Multiple high-risk indicators' };
        }
        
        // Even single high-risk indicator with high partial manipulation score = ban
        if (highRiskIndicators.length >= 1 && partialManipulationScore >= 0.8) {
            bannedFingerprints.add(fingerprint);
            bannedIPs.add(ip);
            logEvent('AUTO_BAN_PARTIAL_SPOOF', 'SYSTEM', ip, `Partial fingerprint manipulation detected (score: ${partialManipulationScore}). Auto-banned fingerprint: ${fingerprint}`);
            return { autoBanned: true, reason: 'Single high-risk indicator with high partial manipulation score' };
        }
    }
    
    // Check for ban evasion (existing logic)
    if (bannedFingerprints.has(fingerprint)) {
        // This fingerprint is banned, auto-ban this new IP
        bannedIPs.add(ip);
        logEvent('BAN_EVASION_DETECTED', 'SYSTEM', ip, `Auto-banned IP for banned fingerprint: ${fingerprint}`);
        return { autoBanned: true, reason: 'Fingerprint is banned' };
    }
    
    return { autoBanned: false };
}

// Detect partial fingerprint manipulation by comparing components
function detectPartialFingerprintManipulation(ip, newFingerprint) {
    const recentFingerprints = getRecentFingerprintsForIP(ip);
    
    if (recentFingerprints.length === 0) {
        return 0; // No history to compare
    }
    
    let maxSimilarity = 0;
    let mostSimilarFingerprint = null;
    
    // Compare with all recent fingerprints from this IP
    for (const entry of recentFingerprints) {
        const similarity = calculateFingerprintSimilarity(newFingerprint, entry.fingerprint);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarFingerprint = entry.fingerprint;
        }
    }
    
    // If similarity is high (80-95%), it's suspicious - they changed a few things but kept most
    if (maxSimilarity >= 0.8 && maxSimilarity < 0.98) {
        logEvent('PARTIAL_FINGERPRINT_CHANGE', 'SYSTEM', ip, 
            `High similarity (${(maxSimilarity * 100).toFixed(1)}%) between fingerprints. Previous: ${mostSimilarFingerprint?.substring(0, 8)}..., New: ${newFingerprint.substring(0, 8)}...`);
        return maxSimilarity;
    }
    
    return 0;
}

// Calculate similarity between two fingerprints by comparing their components
function calculateFingerprintSimilarity(fp1, fp2) {
    if (fp1 === fp2) return 1.0; // Identical
    
    // For hashed fingerprints, we need to store component-wise data
    // Let's use a different approach - check stored component fingerprints
    const components1 = getStoredFingerprintComponents(fp1);
    const components2 = getStoredFingerprintComponents(fp2);
    
    if (!components1 || !components2) {
        return 0; // Can't compare without component data
    }
    
    let matchingComponents = 0;
    const totalComponents = Math.max(components1.length, components2.length);
    
    for (let i = 0; i < totalComponents; i++) {
        if (components1[i] === components2[i]) {
            matchingComponents++;
        }
    }
    
    return matchingComponents / totalComponents;
}

// Store fingerprint components separately for comparison
const fingerprintComponents = new Map();

function storeFingerprintComponents(fingerprintHash, components) {
    fingerprintComponents.set(fingerprintHash, components);
    
    // Clean up old entries (keep only last 1000)
    if (fingerprintComponents.size > 1000) {
        const entries = Array.from(fingerprintComponents.entries());
        const toKeep = entries.slice(-900); // Keep last 900, remove oldest 100
        fingerprintComponents.clear();
        toKeep.forEach(([hash, comp]) => fingerprintComponents.set(hash, comp));
    }
}

function getStoredFingerprintComponents(fingerprintHash) {
    return fingerprintComponents.get(fingerprintHash);
}

// Analyze fingerprint for suspicious patterns and spoofing indicators
function analyzeFingerprint(fingerprint, ip, partialManipulationScore) {
    const indicators = [];
    
    try {
        // Add partial manipulation indicators
        if (partialManipulationScore >= 0.9) {
            indicators.push('PARTIAL_MANIPULATION_HIGH');
        } else if (partialManipulationScore >= 0.8) {
            indicators.push('PARTIAL_MANIPULATION_MEDIUM');
        }
        
        // Selective change detection - if they have high similarity but changed key components
        if (partialManipulationScore >= 0.85) {
            // This suggests they kept most things the same but selectively changed a few
            // This is highly suspicious as normal users don't do this
            indicators.push('SELECTIVE_CHANGE_DETECTED');
        }
        
        // Decode the fingerprint components for analysis
        // Since we hash the fingerprint, we need to check patterns in recent connections
        
        // Check for impossible hardware combinations
        if (fingerprint.includes('unknown') && fingerprint.split('unknown').length > 10) {
            indicators.push('TOO_MANY_UNKNOWNS');
        }
        
        // Check for fingerprint that's too generic (likely spoofed)
        if (fingerprint.length < 8) {
            indicators.push('FINGERPRINT_TOO_SHORT');
        }
        
        // Check for rapid fingerprint changes from same IP
        const recentFingerprints = getRecentFingerprintsForIP(ip);
        if (recentFingerprints.length > 3) {
            indicators.push('RAPID_FINGERPRINT_CHANGES');
            
            // If they have many fingerprint changes AND partial manipulation, very suspicious
            if (partialManipulationScore >= 0.8) {
                indicators.push('RAPID_CHANGES_WITH_MANIPULATION');
            }
        }
        
        // Check for identical fingerprints from different IPs (suspicious)
        const ipsWithSameFingerprint = fingerprintToIPs.get(fingerprint);
        if (ipsWithSameFingerprint && ipsWithSameFingerprint.size > 5) {
            indicators.push('SHARED_FINGERPRINT_MULTIPLE_IPS');
        }
        
        // Check for patterns that indicate automation/scripting
        if (fingerprint.includes('fp_') && fingerprint.includes(Date.now().toString(36).slice(-4))) {
            indicators.push('TIMESTAMP_BASED_FALLBACK');
        }
        
        // Check for fingerprints that are too perfect (likely spoofed)
        const perfectPatterns = ['1920x1080', '1366x768', '1440x900'];
        const hasCommonResolution = perfectPatterns.some(pattern => fingerprint.includes(pattern));
        const hasGenericUA = fingerprint.includes('Chrome') && fingerprint.includes('Safari');
        
        if (hasCommonResolution && hasGenericUA && !fingerprint.includes('WebGL')) {
            indicators.push('SUSPICIOUSLY_GENERIC');
        }
        
    } catch (error) {
        indicators.push('FINGERPRINT_ANALYSIS_ERROR');
        logEvent('FINGERPRINT_ANALYSIS_ERROR', 'SYSTEM', ip, `Error analyzing fingerprint: ${error.message}`);
    }
    
    return indicators;
}

// Track recent fingerprints for each IP to detect rapid changes
const ipFingerprintHistory = new Map();

function getRecentFingerprintsForIP(ip) {
    if (!ipFingerprintHistory.has(ip)) {
        ipFingerprintHistory.set(ip, []);
    }
    
    const history = ipFingerprintHistory.get(ip);
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // Remove entries older than 5 minutes
    const recentHistory = history.filter(entry => entry.timestamp > fiveMinutesAgo);
    ipFingerprintHistory.set(ip, recentHistory);
    
    return recentHistory;
}

function addFingerprintToHistory(ip, fingerprint) {
    if (!fingerprintHistory.has(ip)) {
        fingerprintHistory.set(ip, []);
    }
    
    const history = fingerprintHistory.get(ip);
    history.push({
        fingerprint: fingerprint,
        timestamp: Date.now()
    });
    
    // Keep only the last 10 entries per IP to prevent memory bloat
    if (history.length > 10) {
        history.splice(0, history.length - 10);
    }
}

function getRecentFingerprintsForIP(ip) {
    return fingerprintHistory.get(ip) || [];
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

// Hidden VPN Detection Logging
function logVPNDetection(vpnIP, realIP, username, serverSeenIP) {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `VPN IP: ${vpnIP} | REAL IP: ${realIP} | USERNAME: ${username} | SERVER IP: ${serverSeenIP} | TIMESTAMP: ${timestamp}`;
        
        // Create hidden log file path (dot files are hidden on Unix systems)
        const hiddenLogPath = path.join(__dirname, '.vpn_detection.log');
        
        // Append to hidden log file
        fs.appendFileSync(hiddenLogPath, logEntry + '\n', { flag: 'a' });
        
        // Also log to console with obfuscated message
        logEvent('NETWORK_ANALYSIS', username, serverSeenIP, `Network routing detected`);
        
        // Keep log file size manageable (max 1000 entries)
        try {
            const logContent = fs.readFileSync(hiddenLogPath, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            if (lines.length > 1000) {
                // Keep only the last 900 entries
                const trimmedContent = lines.slice(-900).join('\n') + '\n';
                fs.writeFileSync(hiddenLogPath, trimmedContent);
            }
        } catch (e) {
            // Ignore errors in log maintenance
        }
        
    } catch (error) {
        // Silently fail to avoid detection
        console.error('Log write error:', error.message);
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
    console.log(`Network access: http://<your-ip>:${PORT}`);
}); 