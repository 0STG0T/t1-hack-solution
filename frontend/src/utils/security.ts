import CryptoJS from 'crypto-js';

interface EncryptedData {
  data: string;
  iv: string;
}

declare module 'crypto-js' {
  interface WordArray {
    toString(encoder?: Encoder): string;
    words: number[];
    sigBytes: number;
    concat(wordArray: WordArray): WordArray;
    clamp(): void;
    clone(): WordArray;
  }

  interface Encoder {
    parse(str: string): WordArray;
    stringify(wordArray: WordArray): string;
  }
}

class SecurityUtils {
  private readonly keySize: number = 256;
  private readonly iterations: number = 100;

  // Generate a secure key from a password
  private generateKey(password: string, salt: string): CryptoJS.WordArray {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.keySize / 32,
      iterations: this.iterations
    });
  }

  // Encrypt data with AES
  public encryptData(data: any, password: string): EncryptedData {
    try {
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const key = this.generateKey(password, salt.toString());
      const iv = CryptoJS.lib.WordArray.random(128 / 8);

      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      return {
        data: salt.toString() + encrypted.toString(),
        iv: iv.toString()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data with AES
  public decryptData(encryptedData: EncryptedData, password: string): any {
    try {
      const salt = CryptoJS.enc.Hex.parse(encryptedData.data.substr(0, 32));
      const key = this.generateKey(password, salt.toString());
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

      const encrypted = encryptedData.data.substring(32);
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });

      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Simple encrypt/decrypt methods for WebSocket messages
  public encrypt(data: string, key: string): string {
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  public decrypt(encryptedData: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Hash sensitive data (e.g., for caching keys)
  public hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // Sanitize user input
  public sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate file types
  public validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileType = file.type.toLowerCase();
    return allowedTypes.some(type => fileType.includes(type));
  }

  // Secure storage operations
  public secureStore = {
    // Set item with encryption
    setItem: (key: string, value: any, password: string): void => {
      try {
        const encrypted = this.encryptData(value, password);
        localStorage.setItem(
          this.hashData(key),
          JSON.stringify(encrypted)
        );
      } catch (error) {
        console.error('Failed to store data securely:', error);
        throw new Error('Failed to store data securely');
      }
    },

    // Get item with decryption
    getItem: (key: string, password: string): any => {
      try {
        const encrypted = localStorage.getItem(this.hashData(key));
        if (!encrypted) return null;

        const encryptedData: EncryptedData = JSON.parse(encrypted);
        return this.decryptData(encryptedData, password);
      } catch (error) {
        console.error('Failed to retrieve data securely:', error);
        throw new Error('Failed to retrieve data securely');
      }
    },

    // Remove item
    removeItem: (key: string): void => {
      localStorage.removeItem(this.hashData(key));
    },

    // Clear all secure storage
    clear: (): void => {
      localStorage.clear();
    }
  };

  // Session management
  public session = {
    // Create secure session
    create: (userData: any, password: string): void => {
      const sessionId = CryptoJS.lib.WordArray.random(128 / 8).toString();
      const timestamp = new Date().getTime();

      const sessionData = {
        id: sessionId,
        userData,
        timestamp,
        expiresAt: timestamp + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.secureStore.setItem('session', sessionData, password);
    },

    // Validate session
    validate: (password: string): boolean => {
      try {
        const session = this.secureStore.getItem('session', password);
        if (!session) return false;

        const now = new Date().getTime();
        if (now > session.expiresAt) {
          this.session.destroy();
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },

    // Destroy session
    destroy: (): void => {
      this.secureStore.removeItem('session');
    }
  };

  // WebSocket security
  public websocket = {
    // Generate secure WebSocket message
    secureMessage: (message: any, password: string): string => {
      const encrypted = this.encryptData(message, password);
      return JSON.stringify(encrypted);
    },

    // Parse secure WebSocket message
    parseMessage: (encryptedMessage: string, password: string): any => {
      try {
        const encrypted: EncryptedData = JSON.parse(encryptedMessage);
        return this.decryptData(encrypted, password);
      } catch (error) {
        console.error('Failed to parse secure message:', error);
        throw new Error('Failed to parse secure message');
      }
    }
  };
}

export const securityUtils = new SecurityUtils();
