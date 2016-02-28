var express = require('express')
var app = express();
var http = require('http').Server(app);
var client_io = require('socket.io')(http);

var crypto = require('crypto')


var clients = []

// Connect to server
var server_io = require('socket.io-client');
var server_socket = server_io.connect('http://localhost:3001', {reconnect: true});

// Add a connect listener
server_socket.on('connect', function(socket) {
  console.log('Connected to server.');
});

client_io.on('connection', function(client){

  console.log(client.id)
  console.log('generating keys')

  // generate a key for the client
  var keypair = crypto.getDiffieHellman('modp14')
  keypair.generateKeys()

  client.keypair = keypair

  server_socket.emit('new_keypair', {
    id: client.id,
    publickey: keypair.getPublicKey('hex')
  })

  clients.push(client)
  console.log('a user connected');
  client.on('disconnect',function(){

    server_socket.emit('remove_keypair', {
      id: client.id
    })
    
    clients = clients.filter(function(c){return c !== client})
    console.log('socket disconnected', clients.length, 'clients remaining.')
  })
});

app.use(express.static('public'))

http.listen(3000, function(){
  console.log('listening on *:3000');
});
