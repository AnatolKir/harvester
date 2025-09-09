import { randomBytes } from 'crypto';

export function generateCorrelationId(): string {
  // 16-char hex for brevity; sufficient for correlation purposes
  return randomBytes(8).toString('hex');
}


