/**
 * General validation utility functions for PulseAPI
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant regex simplified for practical production use
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email.trim()) && email.length <= 190;
}

function isValidPassword(password) {
  // At least 8 characters, at least 1 digit, at least 1 letter
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function isValidSlug(slug) {
  // Lowercase alphanumeric and hyphens, 3 to 100 characters
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 100;
}

function sanitizeString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidSlug,
  sanitizeString
};
