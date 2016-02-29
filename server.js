// coordinates publickeys between crypto-proxies
// coordinates encrypted messages between crypto-proxies

var http = require('http')
var io = require('socket.io')

var port = process.argv[2] || '3001'
var key_refresh_interval = 2000 // in ms

// Create server & socket
var server = http.createServer(function (req, res) {
  // Send HTML headers and message
  res.writeHead(404, {
    'Content-Type': 'text/html'
  });
  res.end('<h1>Nothing. Just 404</h1>');
});

server.listen(port);
io = io.listen(server);

// List of currently connected sockets
var clients = []

// List of public keys currently being coordinated by the server
var keys = []

// helper variables for the key_cleanup process
var outstanding_requests = 0
var key_cleanup = []

// Add a connect listener
io.sockets.on('connection', function (socket) {

  console.log('crypto-proxy connected.');
  clients.push(socket)

  socket.on('chat_message', function (msg) {
    console.log('got an encrypted message [to][from][msg]', msg.from, msg.to, msg.msg)
    clients.forEach(function (c) {
      c.emit('chat_message', msg)
    })
  })

  socket.on('new_keypair', function (msg) {
    // a new public-key arrives from a crypto-proxy
    // check to see if it is already being tracked
    // if not, add it to the list of keys
    // replay the message to the crypto-proxies using the clients array
    //

    console.log()
    if (keys.filter(function (k) {
        return k.id === msg.id
      }).length === 0) {
      keys.push(msg)
    } else {
      console.log('already present')
    }
    console.log('got keypair message', msg.id, 'there are now', keys.length, 'keys present')

    // propagate the keypairs
    broadcast_keys()

  })

  socket.on('remove_keypair', function (msg) {
    clients.forEach(function (c) {
      c.emit('remove_keypair', {
        id: msg.id
      })
    })

    var n_keys = keys.length
    keys = keys.filter(function (k) {
      return k.id !== msg.id
    })
    console.log('removed', n_keys - keys.length, 'keys')
  })

  socket.on('allkeys', function (msg) {
    // this event fires when a
    outstanding_requests -= 1
    msg.keys.forEach(function (key) {
      key_cleanup.push(key)
    })
    if (outstanding_requests === 0) {
      // replace keys with key_cleanup array
      keys = []
      key_cleanup.forEach(function (key) {
        keys.push(key)
      })
      broadcast_keys()
    }
  })

  // Disconnect listener
  socket.on('disconnect', function () {
    clients = clients.filter(function (c) {
      return c !== socket
    })
    console.log('Client disconnected.');
  });
});

function broadcast_keys() {
  clients.forEach(function (c) {
    c.emit('broadcast_public_keys', keys)
  })
}

setInterval(refresh_keys, key_refresh_interval)

function refresh_keys() {
  // console.log('nkeys', keys.length)
  outstanding_requests = 0
  key_cleanup = []
  clients.forEach(function (c) {
    outstanding_requests += 1
    c.emit('key_cleanup', {})
  })
}
