import crypto from 'crypto';

export interface LicensePayload {
  licenseId: string;
  customer: string;
  issuedAt: string;
  expiresAt: string;
  maxSeats: number;
  modules: string[];
}

export interface SignedLicense {
  payload: LicensePayload;
  signature: string;
}

export class OfflineLicenseVerifier {
  /**
   * Generates a signed license file using an RSA private key (PEM format)
   */
  public static signLicense(payload: LicensePayload, privateKeyPem: string): SignedLicense {
    const dataString = JSON.stringify(payload);
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    sign.end();
    const signature = sign.sign(privateKeyPem, 'base64');

    return {
      payload,
      signature,
    };
  }

  /**
   * Cryptographically verifies an offline license using the embedded public key
   */
  public static verifyLicense(
    signedLicense: SignedLicense,
    publicKeyPem: string
  ): { valid: boolean; reason?: string; payload?: LicensePayload } {
    try {
      const dataString = JSON.stringify(signedLicense.payload);
      const verify = crypto.createVerify('SHA256');
      verify.update(dataString);
      verify.end();

      const isSigValid = verify.verify(publicKeyPem, signedLicense.signature, 'base64');
      if (!isSigValid) {
        return { valid: false, reason: 'Cryptographic signature mismatch. License file has been tampered with.' };
      }

      // Check Expiration
      const now = new Date();
      const expiresAt = new Date(signedLicense.payload.expiresAt);
      if (now > expiresAt) {
        return { valid: false, reason: `License expired on ${signedLicense.payload.expiresAt}` };
      }

      return { valid: true, payload: signedLicense.payload };
    } catch (err: any) {
      return { valid: false, reason: `Verification error: ${err.message}` };
    }
  }
}
