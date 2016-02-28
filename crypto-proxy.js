var express = require('express')
var app = express();
var http = require('http').Server(app);
var client_io = require('socket.io')(http);

var port = process.argv[2]

var crypto = require('crypto')

// crypto proxy
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
var private_keys = []
var public_keys = []

/////////////////////////////////////////////////////////////////////////////
// web client IO
client_io.on('connection', function (client) {

  // the id of the browser
  var id = client.id.split('/#')[1]
  clients.push(client)

  console.log('a user connected', id, 'generating keys')

  // generate a key object for the client
  var keypair = crypto.getDiffieHellman('modp14')

  // generate the keys
  keypair.generateKeys()

  // add to list of private keys
  private_keys.push({
    id: id,
    keypair: keypair
  })

  // add hex text of publickey to list of public keys
  public_keys.push({
    id: id,
    publickey: keypair.getPublicKey('hex')
  })

  // send the fresh public key to the key server
  server_socket.emit('new_keypair', {
    id: id,
    publickey: keypair.getPublicKey('hex')
  })

  client.on('chat_message', function (msg) {
    // browser sent a chat message
    // encrypt the message for everyone in the public keys, and fire them off to
    // the server_socket as 'chat_message' events

    console.log('incoming chat message from browser', msg)

    var from_keypair
    console.log('looking for keypair')
    private_keys.forEach(function (key) {
      if (key.id.indexOf(msg.from) !== -1) {
        console.log('found keypair')
        from_keypair = key.keypair
      }
    })
    if(from_keypair === undefined){
      return;
    }


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
      id: client.id.split('/#')[1]
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
  // server is asking for the client to send all the public keys it has
  // private keys for, that are also current connected clients
  var current_client_ids = []
  clients.forEach(function(c){
    current_client_ids.push(c.id.split('/#')[1])
  })

  console.log(current_client_ids)

  var new_private_keys = []
  private_keys.forEach(function(key){
    if(current_client_ids.indexOf(key.id) !== -1){
      new_private_keys.push(key)
    }
  })
  private_keys = new_private_keys

  var msg = {
    keys: []
  }
  private_keys.forEach(function (key) {
    msg.keys.push({
      id: key.id,
      publickey: key.keypair.getPublicKey('hex')
    })
  })
  // console.log(msg)
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

  var keyA = find_key(msg.to)
  var keyB = find_key(msg.from)

  console.log(keyA,keyB)
  console.log(keyA.type, keyB.type)

  var private_key_obj, public_key_hex

  if (keyA.type === 'private' && keyB.type === 'public') {
    console.log('here private public')
    console.log(keyA.keypair)
    private_key_obj = keyA.key.keypair
    public_key_hex = keyB.key.publickey
    // console.log(private_key_obj)
  } else if (keyA.type === 'public' && keyB.type === 'private') {
    console.log('here public private')
    private_key_obj = keyB.key.keypair
    public_key_hex = keyA.key.publickey
    // console.log(private_key_obj)
  } else if (keyA.type === 'private' && keyB.type === 'private') {
    console.log('here private private')
    private_key_obj = keyA.key.keypair
    public_key_hex = keyB.key.keypair.getPublicKey('hex')
    // console.log(private_key_obj)
  } else {
    return console.log('no private key found for message, moving on...')
  }

  console.log('beyond the if check for key types')
  console.log(private_key_obj, public_key_hex)

  var shared_secret = private_key_obj.computeSecret(public_key_hex, 'hex', 'hex')

  // create 256 bit hash of the shared secret to use as the AES key
  var password = crypto.createHash('sha256').update(shared_secret).digest()

  // encrypt
  var decipher = crypto.createDecipher('aes256', password)
  var plain_text = Buffer.concat([decipher.update(Buffer(msg.msg, 'hex')), decipher.final()])

  var decrypted_msg = {
    from: msg.from,
    to: msg.to,
    msg: plain_text.toString()
  }
  console.log('decrypted_message', decrypted_msg)

  // send message to the client with the id of msg.to
  clients.forEach(function (client) {
    if (client.id.indexOf(msg.to) !== -1) {
      console.log('sending message to browser')
      client.emit('decrypted_message', decrypted_msg)
    }
  })
  return;
})

function find_key(id) {
  var keyfound = false
  var returnkey
  var type

  private_keys.forEach(function (key) {
    if (key.id.indexOf(id) !== -1) {
      keyfound = true
      returnkey = key
      type = 'private'
    }
  })

  if (!keyfound) {
    public_keys.forEach(function (key) {
      if (key.id.indexOf(id) !== -1) {
        // console.log('here', key)
        keyfound = true
        returnkey = key
        type = 'public'
      }
    })
  }

  if (keyfound) {
    return {
      search_id: id,
      key: returnkey,
      type: type
    }
  } else {
    return -1
  }

}


app.use(express.static('public'))

http.listen(port, function () {
  console.log('listening on *:' + port);
});
