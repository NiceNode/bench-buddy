/**
 * This server listens for udp messages and responds.
 * It is currently used to confirm users are not behind a
 * firewall blocking certain ports or udp. The udp protocol is
 * used for discovering other node peers.
 */

const dgram = require('node:dgram');

const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
	server.send("echo", rinfo.port, rinfo.address)
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(30303);