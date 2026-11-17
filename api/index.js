/**
 * Vercel Serverless Function Entrypoint
 * Bridges Vercel requests to the modular EdTechHub Operating System handler.
 */
const handleRequest = require('../server.js');

module.exports = (req, res) => {
  return handleRequest(req, res);
};
