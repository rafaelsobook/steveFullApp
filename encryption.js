const crypto = require('crypto');
const config = require('./config');

class Encryptor {
    constructor() {
        // Convert hex string back to Buffer if needed
        this.key = Buffer.from(config.encryptionKey, 'hex');
        if (this.key.length !== 32) {
            throw new Error('Encryption key must be exactly 32 bytes');
        }
        this.algorithm = 'aes-256-gcm';
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }

    decrypt(encryptedData) {
        try {
            const [ivHex, encryptedText, authTagHex] = encryptedData.split(':');
            
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }
}

// Export a singleton instance
module.exports = new Encryptor();