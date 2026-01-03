// =====================================================
// Utilidades Criptográficas
// =====================================================

import { ethers } from 'ethers';

/**
 * Genera un nonce único para firmas
 */
export function generateNonce(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Genera el mensaje para firma de wallet
 */
export function generateSignMessage(
  nonce: string,
  action: string,
  timestamp: number
): string {
  return `PolyArbitrage Bot

Acción: ${action}
Nonce: ${nonce}
Timestamp: ${timestamp}

Al firmar este mensaje, autorizas la acción indicada.
Esta firma NO realiza ninguna transacción en blockchain.`;
}

/**
 * Verifica una firma de wallet
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Calcula checksum de dirección
 */
export function checksumAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch {
    return address;
  }
}

/**
 * Genera hash de datos para logging
 */
export function hashData(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Encripta datos sensibles (para almacenamiento temporal)
 * NOTA: En producción usar una librería de encriptación robusta
 */
export function encryptForSession(data: string, key: string): string {
  // Implementación simplificada - usar AES-256-GCM en producción
  const encoded = Buffer.from(data).toString('base64');
  return encoded;
}

/**
 * Desencripta datos de sesión
 */
export function decryptFromSession(encrypted: string, key: string): string {
  // Implementación simplificada - usar AES-256-GCM en producción
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

/**
 * Genera ID único para transacciones
 */
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Valida que una firma no haya expirado
 */
export function isSignatureExpired(timestamp: number, maxAgeSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now - timestamp) > maxAgeSeconds;
}
