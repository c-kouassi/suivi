const assert = require('node:assert/strict');

const emailService = require('../utils/email');

assert.ok(emailService && typeof emailService.sendAccountConfirmationEmail === 'function');
assert.ok(emailService.buildConfirmationEmail && typeof emailService.buildConfirmationEmail === 'function');

console.log('email-service-ok');
