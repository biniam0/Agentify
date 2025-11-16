import crypto from 'crypto';

/**
 * Verify ElevenLabs webhook signature
 * Format: "t=timestamp,v0=signature"
 */
export const verifyElevenLabsSignature = (
    signature: string | undefined,
    payload: any,
    secret: string
): boolean => {
    if (!signature || !secret) {
        console.log('⚠️  Signature verification skipped (missing signature or secret)');
        return true; // Skip verification if not configured
    }

    try {
        // Parse signature header: "t=1762499913,v0=ccdbaa..."
        const parts = signature.split(',');
        const timestamp = parts[0]?.split('=')[1];
        const signatureHash = parts[1]?.split('=')[1];

        if (!timestamp || !signatureHash) {
            console.log('❌ Invalid signature format');
            return false;
        }

        // Create signed payload: timestamp.payload
        const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;

        // Generate HMAC SHA-256 signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload)
            .digest('hex');

        // Compare signatures
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signatureHash),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            console.log('❌ Signature verification failed');
            return false;
        }

        // Optional: Check timestamp freshness (prevent replay attacks)
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - parseInt(timestamp);

        if (timeDiff > 300) { // 5 minutes tolerance
            console.log('⚠️  Webhook timestamp too old (possible replay attack)');
            // Still return true but log warning
        }

        console.log('✅ Signature verified successfully');
        return true;

    } catch (error) {
        console.error('❌ Signature verification error:', error);
        return false;
    }
};

