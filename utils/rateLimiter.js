const rateLimiter = new Map(); // address -> { messages: number, lastReset: timestamp }
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;

const checkRateLimit = (address) => {
  const now = Date.now();
  const userLimit = rateLimiter.get(address);

  if (!userLimit) {
    rateLimiter.set(address, { messages: 1, lastReset: now });
    return true;
  }

  // Reset if window expired
  if (now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimiter.set(address, { messages: 1, lastReset: now });
    return true;
  }

  // Check if under limit
  if (userLimit.messages < MAX_MESSAGES_PER_WINDOW) {
    userLimit.messages++;
    return true;
  }

  return false;
};

module.exports = { checkRateLimit };
