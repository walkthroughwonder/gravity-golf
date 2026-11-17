'use strict';

const net = require('node:net');
const { syncBuiltinESMExports } = require('node:module');
const originalListen = net.Server.prototype.listen;

// Applied only to the local test process and its Node workers, never installed globally.
net.Server.prototype.listen = function (...args) {
  let options;
  let callback;
  if (args[0] && typeof args[0] === 'object') {
    options = { ...args[0] };
    callback = typeof args[1] === 'function' ? args[1] : undefined;
  } else if (typeof args[0] === 'number' || (typeof args[0] === 'string' && /^\d+$/.test(args[0]))) {
    options = { port: Number(args[0]) };
    let index = 1;
    if (typeof args[index] === 'string') options.host = args[index++];
    if (typeof args[index] === 'number') options.backlog = args[index++];
    if (typeof args[index] === 'function') callback = args[index];
  } else {
    throw new Error('Local preview requires an explicit TCP listen operation');
  }
  if (options.port === undefined || options.path || options.fd !== undefined || options.handle) {
    throw new Error('Local preview cannot listen on inherited handles or sockets');
  }
  const host = options.host;
  if (host === undefined || host === '' || host === 'localhost' || host === '0.0.0.0' || host === '::') {
    options.host = '127.0.0.1';
  } else if (host !== '127.0.0.1' && host !== '::1') {
    throw new Error('Local preview cannot bind a non-loopback address');
  }
  return originalListen.call(this, options, ...(callback ? [callback] : []));
};
syncBuiltinESMExports();
