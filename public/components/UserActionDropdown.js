class UserActionDropdown {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.currentDropdown = null;
        this.currentUser = null;
        this.isVisible = false;
        
        // Bind methods to preserve 'this' context
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        this.boundHandleEscapeKey = this.handleEscapeKey.bind(this);
    }

    show(user, buttonElement) {
        // Hide any existing dropdown first
        this.hide();
        
        this.currentUser = user;
        this.isVisible = true;
        
        // Create dropdown element
        this.currentDropdown = document.createElement('div');
        this.currentDropdown.className = 'user-action-dropdown';
        this.currentDropdown.innerHTML = `
            <div class="user-action-list">
                <div class="user-action-item direct-message" data-action="direct-message">
                    <div class="user-action-icon">💬</div>
                    <div class="user-action-text">Direct Message</div>
                </div>
                <div class="user-action-item block" data-action="block">
                    <div class="user-action-icon">🚫</div>
                    <div class="user-action-text">Block</div>
                </div>
            </div>
        `;
        
        // Add click handlers for actions
        this.currentDropdown.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.user-action-item');
            if (actionItem) {
                const action = actionItem.dataset.action;
                this.handleAction(action, user);
                this.hide();
            }
        });
        
        // Append to body
        document.body.appendChild(this.currentDropdown);
        
        // Position the dropdown
        this.positionDropdown(buttonElement);
        
        // Add global listeners with a small delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', this.boundHandleDocumentClick);
            document.addEventListener('keydown', this.boundHandleEscapeKey);
        }, 10);
        
        // Show with animation
        requestAnimationFrame(() => {
            this.currentDropdown.classList.add('show');
        });
    }

    hide() {
        if (!this.currentDropdown || !this.isVisible) return;
        
        this.isVisible = false;
        this.currentDropdown.classList.remove('show');
        
        // Remove event listeners
        document.removeEventListener('click', this.boundHandleDocumentClick);
        document.removeEventListener('keydown', this.boundHandleEscapeKey);
        
        // Clean up after animation completes
        setTimeout(() => {
            if (this.currentDropdown && this.currentDropdown.parentNode) {
                this.currentDropdown.parentNode.removeChild(this.currentDropdown);
            }
            this.currentDropdown = null;
            this.currentUser = null;
        }, 250); // Increased timeout to match CSS animation
    }

    positionDropdown(buttonElement) {
        if (!this.currentDropdown || !buttonElement) return;
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const dropdownRect = this.currentDropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = buttonRect.left;
        let top = buttonRect.bottom + 5;
        
        // Adjust horizontal position if dropdown would go off-screen
        if (left + dropdownRect.width > viewportWidth - 10) {
            left = viewportWidth - dropdownRect.width - 10;
        }
        
        // Adjust vertical position if dropdown would go off-screen
        if (top + dropdownRect.height > viewportHeight - 10) {
            top = buttonRect.top - dropdownRect.height - 5;
        }
        
        // Ensure dropdown doesn't go above viewport
        if (top < 10) {
            top = 10;
        }
        
        // Ensure dropdown doesn't go left of viewport
        if (left < 10) {
            left = 10;
        }
        
        this.currentDropdown.style.left = `${left}px`;
        this.currentDropdown.style.top = `${top}px`;
    }

    handleAction(action, user) {
        switch (action) {
            case 'direct-message':
                this.chatApp.openDMModal(user);
                break;
            case 'block':
                // For now, block doesn't do anything as requested
                console.log(`Block action triggered for user: ${user.username}`);
                // You can add block functionality here in the future
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    handleDocumentClick(e) {
        // Don't close if clicking inside the dropdown
        if (this.currentDropdown && this.currentDropdown.contains(e.target)) {
            return;
        }
        
        // Don't close if clicking on a user tag (let it handle showing a new dropdown)
        if (e.target.closest('.user-tag.clickable-username')) {
            return;
        }
        
        // Close dropdown if clicking elsewhere
        this.hide();
    }

    handleEscapeKey(e) {
        // Close dropdown on Escape key
        if (e.key === 'Escape') {
            this.hide();
        }
    }

    isOpen() {
        return this.isVisible;
    }
} 