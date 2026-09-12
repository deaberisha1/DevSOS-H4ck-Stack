require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initSocket } = require('./shared/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`[DevSOS] Server running on port ${PORT}`);
  console.log(`[DevSOS] Environment: ${process.env.NODE_ENV || 'development'}`);
});
