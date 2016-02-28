// Load requirements

// coordinates publickeys between crypto-proxy's
// coordinates encrypted messages between crypto-proxy's


var http = require('http'),
io = require('socket.io');

// Create server & socket
var server = http.createServer(function(req, res)
{
  // Send HTML headers and message
  res.writeHead(404, {'Content-Type': 'text/html'});
  res.end('<h1>Nothing. Just 404</h1>');
});
server.listen(3001);
io = io.listen(server);

var clients = []
var keys = []

// Add a connect listener
io.sockets.on('connection', function(socket)
{
  console.log('crypto-proxy connected.');

  socket.on('new_keypair', function(msg){
    console.log('got keypair message')
    console.log(msg)
    keys.push(msg)

    console.log(keys.length, 'keys present')

    // propagate the keypairs
    clients.forEach(function(c,idx){
      console.log('sending message to', idx)
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

  clients.push(socket)

  // Disconnect listener
  socket.on('disconnect', function() {
    clients = clients.filter(function(c){ return c !== socket})
    console.log('Client disconnected.');
  });
});
