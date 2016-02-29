# encrypted-socket.io-chatroom
> end-to-end public-key encrypted socket.io based chatroom

> **important note** this application is for educational purposes, and is not meant to be used in a production environment where safety is a concern.

![Chatroom window](screenshot.png?raw=true)

### use

```bash
# clone repo
git clone git@github.com:billautomata/encrypted-socket.io-chatroom.git
cd encrypted-socket.io-chatroom
npm install

# to start the coordination server
# the first argument is the port
node server.js 3001

# to start the local proxy server
# the first argument is the port
# the second argument is the address and port of the coordinator server
node crypto-proxy.js 3003 http://localhost:3001

# open the browser to connect to the local proxy that mediates the keys
# and the encryption / decryption operations.
open http://localhost:3003
```

### description

#### `browser` > `localhost` > `proxy (encrypts)` > `server`
#### < < < < `server only sees encrypted messages` > > > >
#### `server` > `proxy (decrypts)` > `localhost` > `browser`

The client application is served to the `browser` from a local `proxy` server.  The `proxy` handles all the key coordination, shared secret computation, encryption, decryption, and message routing.  The `server` never sees anything but public keys, and encrypted messages.

After connecting to the local `proxy` the user generates a [Diffie-Hellman](https://nodejs.org/api/crypto.html#crypto_class_diffiehellman) key-pair. While the **private key** remains on the local `proxy`, the _public key_ is broadcast to all other `proxies` in a process mediated through the `server`.  That _public key_ is used by other proxies to encrypt the individual messages.

In our chatroom when a user sends a message, it is broadcast to all users.  In an **unencrypted** environment the user need only transmit one message for any and all other users to read it.  But in an *end-to-end* **encrypted** environment, using a combination of *asymmetric encryption* and *symmetric encryption*, the user needs to create individual encrypted messages for each user in the channel.  Each message is encrypted with a separate key-pair combination, and thus a different password for each message.

### message lifecycle description

```javascript
// psuedocode, proxy send a message to everyone on the server
on('send_message', fn(msg){

  // for each person in the room
  everyone_in_room.forEach(fn(other_user){

    // compute shared secret, using the key-pair
    secret = my_private_key.computeSharedSecret(other_user.publickey)

    // determine a symmetric key from a hash of the shared secret
    symmetric_key = createHashSHA256(secret)

    // create the encrypted version of the message
    encrypted_text = encryptAES256(msg, symmetric_key)

    // send the message to the server
    server.emit({
      from: my_user_id,
      to: other_user.id,
      encrypted_data: encrypted_text
    })

  })
})
```

```javascript
// psuedocode, proxy got a message from the server
on('got_message', fn(msg){

  // get the public key associated with the sender, from a local array
  var other_user_public_key = getPublicKey(msg.from)

  // get the private key of mine, from a local array
  var my_private_key = getPrivateKey(msg.to)

  // compute the shared secret
  var secret = my_private_key.computeSharedSecret(other_user_public_key)

  // compute the hash of the secret
  var symmetric_key = createHashSHA256(secret)

  // pass the encrypted data and the key to the decipher function
  var plain_text = decryptAES256(msg.encrypted_data, symmetric_key)

  // pass long the decrypted message to the correct user connected to the proxy
  user_socket[msg.to].emit({
    from: msg.from
    to: msg.to,
    decrypted_data: plain_text
  })

})
```

The individual messages are encrypted using [AES256](https://nodejs.org/api/crypto.html#crypto_crypto_createcipher_algorithm_password) symmetric cipher.
