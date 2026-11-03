const dns = require('dns').promises;
const net = require('net');

/**
 * Checks if an IPv4 address falls within private, loopback, or reserved ranges.
 * @param {string} ip - IPv4 string
 * @returns {boolean} - true if IP is private/reserved/internal
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP, block it
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback addresses)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private-Use Class A)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private-Use Class B: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private-Use Class C)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata service e.g. AWS/Azure/GCP 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address falls within private, loopback, or link-local ranges.
 * @param {string} ip - IPv6 string
 * @returns {boolean} - true if IP is private/internal
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();

  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // Unspecified ::
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 address (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:') || normalized.includes(':ffff:')) {
    const lastPart = ip.split(':').pop();
    if (net.isIPv4(lastPart)) {
      return isPrivateIPv4(lastPart);
    }
  }

  // Link-local unicast fe80::/10
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || 
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Unique local address fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities.
 * @param {string} targetUrl - The URL to validate
 * @returns {Promise<{safe: boolean, reason?: string, parsedUrl?: URL}>}
 */
async function validateUrlForSSRF(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { safe: false, reason: 'URL must be a non-empty string.' };
  }

  let parsed;
  try {
    parsed = new URL(targetUrl.trim());
  } catch (err) {
    return { safe: false, reason: 'Invalid URL syntax.' };
  }

  // Strictly enforce HTTP or HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Forbidden protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  // Reject basic-auth in URL (e.g. user:pass@host)
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'URLs containing credentials are not permitted.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost, reserved TLDs and internal host patterns
  const forbiddenHostnames = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
  if (forbiddenHostnames.includes(hostname)) {
    return { safe: false, reason: 'Access to localhost and loopback hostnames is prohibited.' };
  }

  const forbiddenSuffixes = ['.local', '.internal', '.corp', '.lan', '.home', '.arpa', '.invalid', '.test'];
  if (forbiddenSuffixes.some(suffix => hostname.endsWith(suffix))) {
    return { safe: false, reason: 'Access to internal or reserved private domain extensions is prohibited.' };
  }

  // Check direct IP addresses
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
      return { safe: false, reason: `Access to private IPv4 address (${hostname}) is blocked.` };
    }
    if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
      return { safe: false, reason: `Access to private IPv6 address (${hostname}) is blocked.` };
    }
  }

  // Resolve hostname via DNS to prevent DNS rebinding to private IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      return { safe: false, reason: `Could not resolve hostname "${hostname}".` };
    }

    for (const record of addresses) {
      const { address, family } = record;
      if (family === 4 && isPrivateIPv4(address)) {
        return { safe: false, reason: `Hostname resolves to prohibited private IPv4 address (${address}).` };
      }
      if (family === 6 && isPrivateIPv6(address)) {
        return { safe: false, reason: `Hostname resolves to prohibited private IPv6 address (${address}).` };
      }
    }
  } catch (dnsErr) {
    return { safe: false, reason: `DNS resolution failed for hostname "${hostname}": ${dnsErr.message}` };
  }

  return { safe: true, parsedUrl: parsed };
}

module.exports = {
  validateUrlForSSRF,
  isPrivateIPv4,
  isPrivateIPv6
};
