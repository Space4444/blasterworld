class ReconnectingWebSocket {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 40;
        this.status = false;

        this.callbacks = new Map();
        
        this.connect(5000);
    }

    connect(timeout) {
        console.log('Connecting WebSocket...');
        this.socket = new WebSocket(this.url);
        
        setTimeout( () => {
            if (this.socket.readyState !== 1) {
                this.socket.close();
            }
        }, timeout);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.status = '';
            this.reconnectAttempts = 0; // reset attempts on success
            this.emit = (label, data) => this.socket.send( JSON.stringify({label, data}) );
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket closed:', event.reason);
            this.emit = () => {};
            this.handleReconnect();
        };

        this.socket.onmessage = (event) => {
            const {label, data} = JSON.parse(event.data);
            this.callbacks.get(label)?.(data);
        }

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.socket.close(); // Triggers onclose event
        };
    }

    on(label, callback) {
        this.callbacks.set(label, callback);
    }
    once(label, callback) {
        this.callbacks.set(label, data => {
            callback(data);
            this.callbacks.delete(label);
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached. Giving up.');
            this.status = 'disconnected from the server';
            return;
        }
        this.status = 'disconnected from the server, reconnecting...';
        const delay = Math.min(250 * Math.pow(2, this.reconnectAttempts), 2500);
        this.reconnectAttempts++;
        console.log(`Reconnecting in ${delay / 1000} seconds... (Attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(delay), delay);
    }
}

function io() {
    const ssl = window.location.protocol === 'https:';
    const protocol = ssl ? 'wss' : 'ws';
    const url = protocol + '://' + location.host + '/websocket';
    return new ReconnectingWebSocket(url);
}
