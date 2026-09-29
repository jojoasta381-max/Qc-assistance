import dns from 'dns';
import net from 'net';

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
  resolvedIps?: string[];
}

/**
 * Checks if a parsed IPv4 address falls within private, loopback, link-local, multicast, or reserved ranges.
 */
function isPrivateOrReservedIpv4(ip: string): { isPrivate: boolean; reason?: string } {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { isPrivate: true, reason: 'Malformed IPv4 address format.' };
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 Current network
  if (a === 0) {
    return { isPrivate: true, reason: 'Current network source (0.0.0.0/8) is prohibited.' };
  }

  // 10.0.0.0/8 RFC1918 Private
  if (a === 10) {
    return { isPrivate: true, reason: 'RFC1918 private network (10.0.0.0/8) is prohibited.' };
  }

  // 100.64.0.0/10 Carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) {
    return { isPrivate: true, reason: 'Carrier-grade NAT (100.64.0.0/10) is prohibited.' };
  }

  // 127.0.0.0/8 Loopback
  if (a === 127) {
    return { isPrivate: true, reason: 'Loopback address (127.0.0.0/8) is prohibited.' };
  }

  // 169.254.0.0/16 Link-local & Cloud Metadata
  if (a === 169 && b === 254) {
    return { isPrivate: true, reason: 'Link-local and cloud metadata range (169.254.0.0/16) is prohibited.' };
  }

  // 172.16.0.0/12 RFC1918 Private
  if (a === 172 && b >= 16 && b <= 31) {
    return { isPrivate: true, reason: 'RFC1918 private network (172.16.0.0/12) is prohibited.' };
  }

  // 192.0.0.0/24 IETF Protocol Assignments
  if (a === 192 && b === 0 && c === 0) {
    return { isPrivate: true, reason: 'IETF protocol assignment range is prohibited.' };
  }

  // 192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 0 && c === 2) {
    return { isPrivate: true, reason: 'Test network TEST-NET-1 is prohibited.' };
  }

  // 192.168.0.0/16 RFC1918 Private
  if (a === 192 && b === 168) {
    return { isPrivate: true, reason: 'RFC1918 private network (192.168.0.0/16) is prohibited.' };
  }

  // 198.18.0.0/15 Benchmark testing
  if (a === 198 && (b === 18 || b === 19)) {
    return { isPrivate: true, reason: 'Benchmark testing network is prohibited.' };
  }

  // 198.51.100.0/24 TEST-NET-2
  if (a === 198 && b === 51 && c === 100) {
    return { isPrivate: true, reason: 'Test network TEST-NET-2 is prohibited.' };
  }

  // 203.0.113.0/24 TEST-NET-3
  if (a === 203 && b === 0 && c === 113) {
    return { isPrivate: true, reason: 'Test network TEST-NET-3 is prohibited.' };
  }

  // 224.0.0.0/4 Multicast
  if (a >= 224 && a <= 239) {
    return { isPrivate: true, reason: 'Multicast address range (224.0.0.0/4) is prohibited.' };
  }

  // 240.0.0.0/4 Reserved
  if (a >= 240) {
    return { isPrivate: true, reason: 'Reserved or broadcast address is prohibited.' };
  }

  return { isPrivate: false };
}

/**
 * Checks if a parsed IPv6 address falls within private, loopback, link-local, or unique-local ranges.
 */
function isPrivateOrReservedIpv6(ip: string): { isPrivate: boolean; reason?: string } {
  const normalized = ip.toLowerCase();

  // IPv6 Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') {
    return { isPrivate: true, reason: 'Unspecified IPv6 address is prohibited.' };
  }

  // IPv6 Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return { isPrivate: true, reason: 'IPv6 loopback address (::1) is prohibited.' };
  }

  // IPv4-mapped IPv6: ::ffff:a.b.c.d or ::ffff:hex
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.substring(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIpv4(v4Part);
    }
    // Hex format: e.g. ::ffff:7f00:1
    const hexParts = v4Part.split(':');
    if (hexParts.length === 2) {
      const h1 = parseInt(hexParts[0], 16);
      const h2 = parseInt(hexParts[1], 16);
      if (!isNaN(h1) && !isNaN(h2)) {
        const v4Dotted = `${(h1 >> 8) & 255}.${h1 & 255}.${(h2 >> 8) & 255}.${h2 & 255}`;
        return isPrivateOrReservedIpv4(v4Dotted);
      }
    }
    return { isPrivate: true, reason: 'IPv4-mapped IPv6 address is prohibited.' };
  }

  // Unique Local Addresses (fc00::/7) - fc00:: and fd00::
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return { isPrivate: true, reason: 'IPv6 Unique Local Address (fc00::/7) is prohibited.' };
  }

  // Link-Local Unicast (fe80::/10) - fe80:: through febf::
  if (/^fe[89ab]/.test(normalized)) {
    return { isPrivate: true, reason: 'IPv6 Link-Local Unicast (fe80::/10) is prohibited.' };
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return { isPrivate: true, reason: 'IPv6 Multicast (ff00::/8) is prohibited.' };
  }

  // Documentation range (2001:db8::/32)
  if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) {
    return { isPrivate: true, reason: 'IPv6 Documentation range is prohibited.' };
  }

  return { isPrivate: false };
}

/**
 * Normalizes decimal, octal, or hex IP representation to standard dotted decimal string.
 */
function normalizeNumericIpv4(raw: string): string | null {
  // Pure integer / decimal representation (e.g. 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(raw)) {
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
    }
  }

  // Hexadecimal representation (e.g. 0x7f000001 -> 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(raw)) {
    const num = parseInt(raw, 16);
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
    }
  }

  return null;
}

/**
 * Comprehensive SSRF URL validator.
 * Performs structural validation, IP range analysis, and DNS resolution to prevent
 * intranet scanning, cloud metadata extraction, and DNS rebinding attacks.
 */
export async function validateSsrfEndpoint(endpointUrl: string): Promise<SsrfValidationResult> {
  if (!endpointUrl || typeof endpointUrl !== 'string') {
    return { safe: false, reason: 'Endpoint URL must be a non-empty string.' };
  }

  let url: URL;
  try {
    url = new URL(endpointUrl.trim());
  } catch {
    return { safe: false, reason: 'Malformed URL format.' };
  }

  // 1. Protocol check
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      safe: false,
      reason: `Prohibited protocol "${url.protocol}". Only "http:" and "https:" are allowed.`,
    };
  }

  let rawHostname = url.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames
  if (rawHostname.startsWith('[') && rawHostname.endsWith(']')) {
    rawHostname = rawHostname.slice(1, -1);
  }

  // 2. Block special hostnames
  if (
    rawHostname === 'localhost' ||
    rawHostname.endsWith('.localhost') ||
    rawHostname.endsWith('.local') ||
    rawHostname.endsWith('.internal') ||
    rawHostname === 'metadata.google.internal' ||
    rawHostname === 'instance-data'
  ) {
    return {
      safe: false,
      reason: `Access to internal host "${rawHostname}" is prohibited.`,
    };
  }

  // 3. Check for decimal/hex encoded IP
  const normalizedDecimal = normalizeNumericIpv4(rawHostname);
  if (normalizedDecimal) {
    const check = isPrivateOrReservedIpv4(normalizedDecimal);
    if (check.isPrivate) {
      return { safe: false, reason: check.reason };
    }
  }

  // 4. Check if hostname is an IPv4 literal
  if (net.isIPv4(rawHostname)) {
    const check = isPrivateOrReservedIpv4(rawHostname);
    if (check.isPrivate) {
      return { safe: false, reason: check.reason };
    }
    return { safe: true, normalizedUrl: url.toString(), resolvedIps: [rawHostname] };
  }

  // 5. Check if hostname is an IPv6 literal
  if (net.isIPv6(rawHostname)) {
    const check = isPrivateOrReservedIpv6(rawHostname);
    if (check.isPrivate) {
      return { safe: false, reason: check.reason };
    }
    return { safe: true, normalizedUrl: url.toString(), resolvedIps: [rawHostname] };
  }

  // 6. DNS Resolution to prevent DNS rebinding & intranet resolution
  try {
    const lookupResults = await dns.promises.lookup(rawHostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, reason: `Could not resolve hostname "${rawHostname}".` };
    }

    const resolvedIps = lookupResults.map((r) => r.address);

    for (const res of lookupResults) {
      if (res.family === 4) {
        const check = isPrivateOrReservedIpv4(res.address);
        if (check.isPrivate) {
          return {
            safe: false,
            reason: `Hostname "${rawHostname}" resolved to prohibited private IP ${res.address} (${check.reason})`,
            resolvedIps,
          };
        }
      } else if (res.family === 6) {
        const check = isPrivateOrReservedIpv6(res.address);
        if (check.isPrivate) {
          return {
            safe: false,
            reason: `Hostname "${rawHostname}" resolved to prohibited IPv6 ${res.address} (${check.reason})`,
            resolvedIps,
          };
        }
      }
    }

    return {
      safe: true,
      normalizedUrl: url.toString(),
      resolvedIps,
    };
  } catch (dnsErr: any) {
    return {
      safe: false,
      reason: `DNS lookup failed for "${rawHostname}": ${dnsErr.message || 'Host not found'}`,
    };
  }
}
