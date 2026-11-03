const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUrlForSSRF, isPrivateIPv4, isPrivateIPv6 } = require('../src/utils/ssrfValidator');

test('SSRF Validator Unit Tests', async (t) => {
  await t.test('Blocks loopback IPv4 addresses', () => {
    assert.strictEqual(isPrivateIPv4('127.0.0.1'), true);
    assert.strictEqual(isPrivateIPv4('127.0.0.254'), true);
  });

  await t.test('Blocks RFC 1918 Class A private IP (10.0.0.0/8)', () => {
    assert.strictEqual(isPrivateIPv4('10.0.0.1'), true);
    assert.strictEqual(isPrivateIPv4('10.254.254.1'), true);
  });

  await t.test('Blocks RFC 1918 Class B private IP (172.16.0.0/12)', () => {
    assert.strictEqual(isPrivateIPv4('172.16.0.1'), true);
    assert.strictEqual(isPrivateIPv4('172.31.255.255'), true);
    // 172.32.0.1 is public
    assert.strictEqual(isPrivateIPv4('172.32.0.1'), false);
  });

  await t.test('Blocks RFC 1918 Class C private IP (192.168.0.0/16)', () => {
    assert.strictEqual(isPrivateIPv4('192.168.1.1'), true);
    assert.strictEqual(isPrivateIPv4('192.168.0.254'), true);
  });

  await t.test('Blocks AWS/Cloud metadata IP (169.254.169.254)', () => {
    assert.strictEqual(isPrivateIPv4('169.254.169.254'), true);
    assert.strictEqual(isPrivateIPv4('169.254.1.1'), true);
  });

  await t.test('Permits legitimate public IPv4 addresses', () => {
    assert.strictEqual(isPrivateIPv4('8.8.8.8'), false);
    assert.strictEqual(isPrivateIPv4('1.1.1.1'), false);
    assert.strictEqual(isPrivateIPv4('142.250.190.46'), false);
  });

  await t.test('Blocks loopback and private IPv6 addresses', () => {
    assert.strictEqual(isPrivateIPv6('::1'), true);
    assert.strictEqual(isPrivateIPv6('fe80::1'), true);
    assert.strictEqual(isPrivateIPv6('fc00::1'), true);
  });

  await t.test('Blocks forbidden schemes (file, ftp, gopher)', async () => {
    const fileRes = await validateUrlForSSRF('file:///etc/passwd');
    assert.strictEqual(fileRes.safe, false);

    const ftpRes = await validateUrlForSSRF('ftp://example.com/test');
    assert.strictEqual(ftpRes.safe, false);
  });

  await t.test('Blocks localhost and internal domains', async () => {
    const localhostRes = await validateUrlForSSRF('http://localhost:5000/api');
    assert.strictEqual(localhostRes.safe, false);

    const internalRes = await validateUrlForSSRF('http://service.internal/secret');
    assert.strictEqual(internalRes.safe, false);
  });

  await t.test('Blocks URLs containing embedded user credentials', async () => {
    const res = await validateUrlForSSRF('http://admin:secret@example.com');
    assert.strictEqual(res.safe, false);
  });
});
