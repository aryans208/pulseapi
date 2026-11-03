const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail, isValidPassword, isValidSlug, sanitizeString } = require('../src/utils/validator');

test('Validation Utility Tests', async (t) => {
  await t.test('Validates legitimate email addresses', () => {
    assert.strictEqual(isValidEmail('developer@pulseapi.dev'), true);
    assert.strictEqual(isValidEmail('jane.doe+test@sub.example.com'), true);
  });

  await t.test('Rejects invalid emails', () => {
    assert.strictEqual(isValidEmail('not-an-email'), false);
    assert.strictEqual(isValidEmail('@domain.com'), false);
    assert.strictEqual(isValidEmail('user@'), false);
    assert.strictEqual(isValidEmail(''), false);
    assert.strictEqual(isValidEmail(null), false);
  });

  await t.test('Validates password complexity (min 8 chars, 1 letter, 1 digit)', () => {
    assert.strictEqual(isValidPassword('PulsePassword123!'), true);
    assert.strictEqual(isValidPassword('securePass99'), true);
    // Too short
    assert.strictEqual(isValidPassword('short1'), false);
    // No digits
    assert.strictEqual(isValidPassword('NoDigitsHereAtAll'), false);
    // No letters
    assert.strictEqual(isValidPassword('1234567890'), false);
  });

  await t.test('Validates public status page slugs', () => {
    assert.strictEqual(isValidSlug('pulse-production-status'), true);
    assert.strictEqual(isValidSlug('api-v1'), true);
    // Uppercase or special characters disallowed
    assert.strictEqual(isValidSlug('Invalid_Slug'), false);
    assert.strictEqual(isValidSlug('has spaces'), false);
    assert.strictEqual(isValidSlug('ab'), false); // too short
  });

  await t.test('Sanitizes string lengths and whitespace', () => {
    const raw = '   PulseAPI Production Monitor   ';
    assert.strictEqual(sanitizeString(raw, 15), 'PulseAPI Produc');
  });
});
