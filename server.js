// Load requirements

// coordinates publickeys between crypto-proxy's
// coordinates encrypted messages between crypto-proxy's

var http = require('http'),
io = require('socket.io');

// Create server & socket
var server = http.createServer(function(req, res){
  // Send HTML headers and message
  res.writeHead(404, {'Content-Type': 'text/html'});
  res.end('<h1>Nothing. Just 404</h1>');
});

server.listen(3001);
io = io.listen(server);

var clients = []
var keys = []
var outstanding_requests = 0
var key_cleanup = []

// Add a connect listener
io.sockets.on('connection', function(socket){
  console.log('crypto-proxy connected.');

  socket.on('new_keypair', function(msg){
    console.log('got keypair message', msg.id)

    if(keys.filter(function(k){ return k.id === msg.id }).length === 0){
      keys.push(msg)
    } else {
      console.log('already present')
    }

    console.log(keys.length, 'keys present')

    // propagate the keypairs
    clients.forEach(function(c,idx){
      c.emit('new_keypair', msg)
    })

  })

  socket.on('remove_keypair', function(msg){
    console.log('got remove keypair message')
    var n_keys = keys.length
    keys = keys.filter(function(k){ return k.id !== msg.id})
    if(n_keys === keys.length){
      console.log('did not remove any keys')
    } else {
      console.log('removed', (n_keys-keys.length), 'keys')
    }
  })

  socket.on('allkeys', function(msg){
    outstanding_requests -= 1
    msg.keys.forEach(function(key){
      key_cleanup.push(key)
    })
    if(outstanding_requests === 0){
      // replace keys with key_cleanup array
      console.log('cleaning up key array from', keys.length)
      keys = []
      key_cleanup.forEach(function(key){
        keys.push(key)
      })
      console.log('to', keys.length)
    }
  })

  clients.push(socket)

  // Disconnect listener
  socket.on('disconnect', function() {
    clients = clients.filter(function(c){ return c !== socket})
    console.log('Client disconnected.');
  });
});

function broadcast_keys(){
  clients.forEach(function(c){
    keys.forEach(function(k){
      c.emit('new_keypair', k)
    })
  })
}

setInterval(refresh_keys,2000)

function refresh_keys(){
  outstanding_requests = 0
  clients.forEach(function(c){
    outstanding_requests += 1
    c.emit('key_cleanup', {})
  })
}
