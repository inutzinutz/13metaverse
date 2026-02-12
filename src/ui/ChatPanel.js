/**
 * ChatPanel — Roblox-style in-game chat
 */
export class ChatPanel {
    constructor() {
        this.container = document.getElementById('chat-panel');
        this.messages = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.isActive = false;
        this.onSend = null;

        this._maxMessages = 50;

        this._bindEvents();
    }

    _bindEvents() {
        // Enter to focus/send
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (this.isActive) {
                    const text = this.input.value.trim();
                    if (text && this.onSend) {
                        this.onSend(text);
                    }
                    this.input.value = '';
                    this.input.blur();
                    this.isActive = false;
                    this.container.classList.remove('active');
                    e.preventDefault();
                } else {
                    this.isActive = true;
                    this.container.classList.add('active');
                    this.input.focus();
                    e.preventDefault();
                }
            } else if (e.key === 'Escape' && this.isActive) {
                this.input.blur();
                this.isActive = false;
                this.container.classList.remove('active');
            }
        });

        // Keep input focused when clicking
        this.input.addEventListener('focus', () => {
            this.isActive = true;
            this.container.classList.add('active');
        });
        this.input.addEventListener('blur', () => {
            setTimeout(() => {
                this.isActive = false;
                this.container.classList.remove('active');
            }, 100);
        });
    }

    addMessage(name, text, color = '#ffffff') {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="chat-name" style="color:${color}">${this._escape(name)}:</span> ${this._escape(text)}`;
        this.messages.appendChild(div);

        // Limit messages
        while (this.messages.children.length > this._maxMessages) {
            this.messages.removeChild(this.messages.firstChild);
        }

        this.messages.scrollTop = this.messages.scrollHeight;

        // Flash the panel if not active
        if (!this.isActive) {
            this.container.classList.add('flash');
            setTimeout(() => this.container.classList.remove('flash'), 1000);
        }
    }

    addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message system';
        div.textContent = text;
        this.messages.appendChild(div);
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    isChatActive() {
        return this.isActive;
    }

    _escape(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
