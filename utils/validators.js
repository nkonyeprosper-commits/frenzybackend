const isValidAddress = (address) => {
  return (
    address &&
    typeof address === "string" &&
    address.match(/^0x[a-fA-F0-9]{40}$/)
  );
};

const isValidUsername = (username) => {
  return (
    username &&
    typeof username === "string" &&
    username.trim().length >= 3 &&
    username.trim().length <= 20 &&
    username.match(/^[a-zA-Z0-9_-]+$/)
  );
};

const sanitizeMessage = (message) => {
  return message.trim().substring(0, 500); // Max 500 characters
};

module.exports = { isValidAddress, isValidUsername, sanitizeMessage };
