import { createLogger } from './logger.js';

const httpLogger = createLogger('http');

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const method = String(options.method || 'GET').toUpperCase();

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Falha HTTP ${response.status} em ${method} ${url}`);
      error.status = response.status;
      error.endpoint = url;
      error.method = method;
      throw error;
    }
    return response;
  } catch (error) {
    const normalizedError = error?.name === 'AbortError'
      ? Object.assign(new Error(`Timeout HTTP (${timeoutMs}ms) em ${method} ${url}`), {
        status: 408,
        endpoint: url,
        method
      })
      : error;

    httpLogger.error('fetchWithTimeout failed', {
      action: 'fetchWithTimeout',
      entity: 'http',
      details: {
        endpoint: url,
        method,
        status: normalizedError?.status || null,
        message: normalizedError?.message || String(normalizedError)
      }
    });

    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
}
