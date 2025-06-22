// registration form fixes
document.addEventListener('DOMContentLoaded', () => {
    // wait for chatApp to be initialized
    setTimeout(() => {
        if (!window.chatApp) return;
        
        // add displayName input if missing
        if (!window.chatApp.displayNameInput) {
            window.chatApp.displayNameInput = document.getElementById('displayName');
        }
        
        // add event listeners for displayName
        if (window.chatApp.displayNameInput) {
            window.chatApp.displayNameInput.addEventListener('input', () => {
                window.chatApp.updateJoinButtonState();
            });
            window.chatApp.displayNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.chatApp.joinChat();
            });
        }
        
        // add username validation
        if (window.chatApp.usernameInput) {
            window.chatApp.usernameInput.addEventListener('input', (e) => {
                const username = e.target.value.trim();
                if (username.length > 0) {
                    window.chatApp.checkUsername(username);
                } else {
                    const statusDiv = document.getElementById('usernameStatus');
                    if (statusDiv) {
                        statusDiv.textContent = '';
                        statusDiv.className = 'username-status';
                    }
                    window.chatApp.isUsernameValid = false;
                    window.chatApp.isUsernameTaken = false;
                }
                window.chatApp.updateJoinButtonState();
            });
        }
        
        // fix color picker
        if (window.chatApp.colorPicker) {
            window.chatApp.colorPicker.addEventListener('change', () => {
                window.chatApp.color = window.chatApp.colorPicker.value;
            });
        }
        
        // auto-connect websocket
        window.chatApp.connectWebSocket();
    }, 200);
}); 