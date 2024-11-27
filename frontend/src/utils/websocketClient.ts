import { v4 as uuidv4 } from 'uuid';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  metadata?: Record<string, any>;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private options: WebSocketOptions;

  constructor(options: WebSocketOptions = {}) {
    this.clientId = uuidv4();
    this.options = options;
  }

  connect(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      // Send initial metadata
      this.send('client_metadata', {
        client_id: this.clientId,
        ...this.options.metadata
      });

      this.options.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.options.onMessage?.(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.options.onDisconnect?.();
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.options.onError?.(error);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        if (this.ws?.url) {
          this.connect(this.ws.url);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        client_id: this.clientId,
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getClientId(): string {
    return this.clientId;
  }
}

// Create a singleton instance
const wsClient = new WebSocketClient({
  onConnect: () => {
    console.log('Connected to WebSocket server');
  },
  onDisconnect: () => {
    console.log('Disconnected from WebSocket server');
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  },
  metadata: {
    userAgent: navigator.userAgent,
    language: navigator.language,
    groups: ['default']
  }
});

export default wsClient;
