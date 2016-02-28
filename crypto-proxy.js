var express = require('express')
var app = express();
var http = require('http').Server(app);
var client_io = require('socket.io')(http);

var port = process.argv[2]

var crypto = require('crypto')

// registers web clients
// generates keys for them

// server sends an encrypted message
// in the form of
// {
//   from: id,
//   to: id,
//   data: aes256 encrypted message, with the key being the shared secret of the two keys
// }
//
// if from_id is in keys array and to_id is in clients array
// get private key from clients array and publickey from keys array
// compute shared secret and decrypt message
// send decrypted message to web client[to_id]

// web client sends a message - broadcast
//   get the keypair for the sender
//    for each publickey in keys
//      compute the shared secret
//      encrypt the message
//      send it to the server

var clients = []
var public_keys = []

/////////////////////////////////////////////////////////////////////////////
// web client IO
client_io.on('connection', function(client){

  console.log('a user connected', client.id);
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

  client.on('disconnect',function(){

    server_socket.emit('remove_keypair', {
      id: client.id
    })

    clients = clients.filter(function(c){return c !== client})
    console.log('socket disconnected', clients.length, 'clients remaining.')
  })
});

/////////////////////////////////////////////////////////////////////////////
// server <> server IO
// Connect to server
var server_io = require('socket.io-client');
var server_socket = server_io.connect('http://localhost:3001', {reconnect: true});

// Add a connect listener
server_socket.on('connect', function() {
  console.log('Connected to server.');
  // request keypairs
});

server_socket.on('new_keypair', function(msg){
  // add keypair to keys
  console.log('got a new keypair')
  if(public_keys.filter(function(k){ return k.id === msg.id }).length === 0 ){
    // not already found
    console.log('not found in list of publickeys, adding to list')
    public_keys.push(msg)
  } else {
    console.log('already found in our list of public keys, not adding')
  }
})
server_socket.on('remove_keypair', function(msg){
  // remove key from keys where msg.id = key[n].id
  public_keys = public_keys.filter(function(k){ return k.id !== msg.id })
})
server_socket.on('chat_message', function(msg){
  // incoming chat message from the server
  // { to: id, from: id, data: '...' }
  // find the privatekey for the to_id
  // find the publickey for the from_id
  // decrypt the message
  // emit the decrypted message to the client with the matching to_id
})



app.use(express.static('public'))

http.listen(port, function(){
  console.log('listening on *:'+port);
});
