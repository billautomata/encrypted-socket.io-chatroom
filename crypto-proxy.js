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
client_io.on('connection', function (client) {

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

  client.on('chat_message', function (msg) {
    // browser sent a chat message
    // encrypt the message for everyone in the public keys, and fire them off to
    // the server_socket as 'chat_message' events

    console.log('incoming chat message from browser', msg)

    var from_keypair
    console.log('looking for keypair')
    clients.forEach(function (c) {
      if (c.id.indexOf(msg.from) !== -1) {
        console.log('found keypair')
        from_keypair = c.keypair
      }
    })


    if (msg.to === 'all') {
      console.log('broadcasting to all')
      public_keys.forEach(function (key) {
        // console.log(key)
        var shared_secret = from_keypair.computeSecret(key.publickey, 'hex', 'hex')
          // console.log(shared_secret)

        // create 256 bit hash of the shared secret to use as the AES key
        var password = crypto.createHash('sha256').update(shared_secret).digest()

        // encrypt
        var cipher = crypto.createCipher('aes256', password)
        var cipher_text = Buffer.concat([cipher.update(msg.msg), cipher.final()])

        var encrypted_msg = {
            from: msg.from,
            to: key.id,
            msg: cipher_text.toString('hex')
          }
          // console.log('encrypted_msg',encrypted_msg)

        server_socket.emit('chat_message', encrypted_msg)
      })
    }

    //
  })

  client.on('list_users', function (msg) {
    public_keys.forEach(function (key) {
      console.log(key)
    })
  })

  client.on('disconnect', function () {

    server_socket.emit('remove_keypair', {
      id: client.id
    })

    clients = clients.filter(function (c) {
      return c !== client
    })
    console.log('socket disconnected', clients.length, 'clients remaining.')
  })
});

/////////////////////////////////////////////////////////////////////////////
// server <> server IO
// Connect to server
var server_io = require('socket.io-client');
var server_socket = server_io.connect('http://localhost:3001', {
  reconnect: true
});

// Add a connect listener
server_socket.on('connect', function () {
  console.log('Connected to server.');
  // request keypairs
});

server_socket.on('key_cleanup', function (msg) {
  // server is asking for the client to send all the keys
  var msg = {
    keys: []
  }
  clients.forEach(function (client) {
    msg.keys.push({
      id: client.id,
      publickey: client.keypair.getPublicKey('hex')
    })
  })
  server_socket.emit('allkeys', msg)
})

server_socket.on('new_keypair', function (msg) {
  // add keypair to keys
  // console.log('got a new keypair')
  if (public_keys.filter(function (k) {
      return k.id === msg.id
    }).length === 0) {
    // not already found
    console.log('not found in list of publickeys, adding to list')
    public_keys.push(msg)
  } else {
    // console.log('already found in our list of public keys, not adding')
  }
})
server_socket.on('remove_keypair', function (msg) {
  console.log('got remove keypair event ')
    // remove key from keys where msg.id = key[n].id
  console.log('lenth before', public_keys.length)
  public_keys = public_keys.filter(function (k) {
    return k.id !== msg.id
  })
  console.log('lenth after', public_keys.length)
  console.log()
})
server_socket.on('chat_message', function (msg) {
  // incoming chat message from the server
  // { to: id, from: id, data: '...' }
  // find the privatekey for the to_id
  // find the publickey for the from_id
  // decrypt the message
  // emit the decrypted message to the client with the matching to_id

  console.log('got an encrypted message from the server')
  console.log(msg.to, msg.from)

  // get private key by filtering the clist of clients
  var private_key = clients.filter(function (c) {
    return c.id.indexOf(msg.from) !== -1
  })

  if (private_key.length !== 1) {
    console.log('private key for the message not found by id of from')
    private_key = clients.filter(function (c) {
      return c.id.indexOf(msg.to) !== -1
    })
  }

  if (private_key.length !== 1) {
    console.log('private key for the message not found by id of to')
    return;
  } else {

    console.log('private key for the message found')
    var public_key = public_keys.filter(function (key) {
      return key.id.indexOf(msg.to) !== -1
    })
    if (public_key.length === 0) {
      console.log('associated publickey not found')
      return;
    } else {

      console.log('public key for the to found!')

      console.log('from', msg.from, 'to', msg.to)
      console.log('msg', msg.msg)
      console.log('using private key of',private_key[0].id)
      console.log('and publickey of ', public_key[0].id)

      // console.log(public_keys)
      // console.log('from', msg.from, 'from_id', private_key[0].id, msg.to, public_key[0].id)

      var shared_secret = private_key[0].keypair.computeSecret(public_key[0].publickey, 'hex', 'hex')

      // create 256 bit hash of the shared secret to use as the AES key
      var password = crypto.createHash('sha256').update(shared_secret).digest()

      // encrypt
      var decipher = crypto.createDecipher('aes256', password)
      var plain_text = Buffer.concat([decipher.update(Buffer(msg.msg,'hex')), decipher.final()])

      var decrypted_msg = {
          from: msg.from,
          to: msg.to,
          msg: plain_text.toString()
        }
        console.log('decrypted_message',decrypted_msg)

        // send message to the client with the id of msg.to
        clients.forEach(function(client){
          if(client.id.indexOf(msg.to) !== -1){
            console.log('sending message to browser')
            client.emit('decrypted_message', decrypted_msg)
          }
        })

    }
  }

})



app.use(express.static('public'))

http.listen(port, function () {
  console.log('listening on *:' + port);
});
