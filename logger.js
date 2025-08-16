// Categorized Event Logger with Emojis
// Provides clean, searchable logs with emoji categories

const EVENT_CATEGORIES = {
    // Chat Messages 💬
    CHAT: '💬',
    MESSAGE: '💬',
    EDIT_MESSAGE: '💬',
    DELETE_MESSAGE: '💬',
    REPLY: '💬',
    
    // DM Messages 📞
    DM: '📞',
    DM_MESSAGE: '📞',
    DM_HISTORY_REQUEST: '📞',
    DM_FAILED: '📞',
    
    // User Actions 🌐
    JOIN: '🌐',
    CONNECTION: '🌐',
    DISCONNECT: '🌐',
    USER_UPDATE: '🌐',
    
    // System Events ⚙️
    SYSTEM_MESSAGE: '⚙️',
    FAKE_MESSAGE: '⚙️',
    FAKE_CONNECT: '⚙️',
    FAKE_DISCONNECT: '⚙️',
    
    // Security Events 🔒
    BANNED_IP_ATTEMPT: '🔒',
    BAN_EVASION_BLOCKED: '🔒',
    FINGERPRINT_BAN_COMMAND: '🔒',
    IP_BANNED: '🔒',
    IP_UNBANNED: '🔒',
    BAN_COMMAND: '🔒',
    UNBAN_COMMAND: '🔒',
    
    // Activity Events 👀
    TYPING_START: '👀',
    FINGERPRINT_RECEIVED: '👀',
    FINGERPRINT_TRACKED: '👀',
    
    // Error Events ❌
    PARSE_ERROR: '❌',
    EDIT_FAILED: '❌',
    DELETE_FAILED: '❌',
    UNKNOWN_EVENT: '❌'
};

// Get emoji for event type, fallback to generic system emoji
function getEventEmoji(eventType) {
    return EVENT_CATEGORIES[eventType] || '⚙️';
}

// Format timestamp for logs
function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}

// Main logging function with categorized emojis
function logEvent(eventType, username, ip, details = '') {
    const emoji = getEventEmoji(eventType);
    const timestamp = getTimestamp();
    const user = username || 'unknown';
    
    // Format based on event type for better readability
    switch (eventType) {
        case 'MESSAGE':
            console.log(`${emoji} ${user}: ${details}`);
            break;
            
        case 'DM_MESSAGE':
            // Parse details for "To: targetUser (targetIP), Content length: X chars"
            const dmMatch = details.match(/To: (.*?) \((.*?)\), Content length: (\d+) chars/);
            if (dmMatch) {
                const [, targetUser, targetIP, length] = dmMatch;
                console.log(`${emoji} ${user} (to ${targetUser}): ${length} chars`);
            } else {
                console.log(`${emoji} ${user} > DM: ${details}`);
            }
            break;
            
        case 'EDIT_MESSAGE':
            console.log(`${emoji} ${user} edited message: ${details}`);
            break;
            
        case 'DELETE_MESSAGE':
            console.log(`${emoji} ${user} deleted message: ${details}`);
            break;
            
        case 'JOIN':
            // Parse details for "Color: #color"
            const colorMatch = details.match(/Color: (#\w+)/);
            const color = colorMatch ? colorMatch[1] : 'unknown';
            console.log(`${emoji} JOIN | IP: ${ip} | User: ${user} | Color: ${color}`);
            break;
            
        case 'DM_HISTORY_REQUEST':
            const historyMatch = details.match(/Requesting history with: (.*)/);
            const targetUser = historyMatch ? historyMatch[1] : 'unknown';
            console.log(`${emoji} ${user} opened DM with ${targetUser}`);
            break;
            
        case 'DISCONNECT':
            console.log(`${emoji} ${user} left the chat (IP: ${ip})`);
            break;
            
        case 'TYPING_START':
            console.log(`${emoji} ${user} is typing...`);
            break;
            
        case 'USER_UPDATE':
            console.log(`${emoji} ${user} updated profile: ${details}`);
            break;
            
        case 'BANNED_IP_ATTEMPT':
        case 'BAN_EVASION_BLOCKED':
            console.log(`${emoji} BLOCKED: ${details} (IP: ${ip})`);
            break;
            
        case 'BAN_COMMAND':
        case 'UNBAN_COMMAND':
            console.log(`${emoji} ${user}: ${details}`);
            break;
            
        default:
            // Fallback format for other events
            if (details) {
                console.log(`${emoji} ${eventType} | ${user} | IP: ${ip} | ${details}`);
            } else {
                console.log(`${emoji} ${eventType} | ${user} | IP: ${ip}`);
            }
    }
}

// Specialized logging functions for common patterns
function logChatMessage(username, content, attachments = 0, replyTo = null) {
    if (replyTo) {
        const replyPreview = replyTo.length > 20 ? replyTo.substring(0, 20) + '...' : replyTo;
        console.log(`💬 ${username} (replying to "${replyPreview}"): ${content}`);
    } else {
        const attachmentText = attachments > 0 ? ` [${attachments} attachment${attachments > 1 ? 's' : ''}]` : '';
        console.log(`💬 ${username}: ${content}${attachmentText}`);
    }
}

function logDMMessage(senderUsername, targetUsername, content) {
    console.log(`📞 ${senderUsername} (to ${targetUsername}): ${content}`);
}

function logMessageEdit(username, originalContent, newContent) {
    const original = originalContent.length > 30 ? originalContent.substring(0, 30) + '...' : originalContent;
    const newText = newContent.length > 30 ? newContent.substring(0, 30) + '...' : newContent;
    console.log(`💬 ${username} edited message "${original}" to "${newText}"`);
}

function logMessageDelete(username, deletedContent) {
    const content = deletedContent.length > 30 ? deletedContent.substring(0, 30) + '...' : deletedContent;
    console.log(`💬 ${username} deleted message "${content}"`);
}

module.exports = {
    logEvent,
    logChatMessage,
    logDMMessage,
    logMessageEdit,
    logMessageDelete,
    getEventEmoji,
    EVENT_CATEGORIES
}; 