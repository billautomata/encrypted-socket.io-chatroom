# otr_socket.io-chatroom
> end to end encrypted socket.io based chatroom

#### `browser` > `localhost` > `proxy (encrypted)` > `server`
#### `server` > `proxy (decrypted)` > `localhost` > `browser`

The client application is served to the `browser` from a local `proxy` server.  The `proxy` handles all the key coordination, shared secret computation, encryption, decryption, and message routing.  The `server` never sees anything but public keys, and encrypted messages.

After connecting to the local proxy the user generates a Diffie Hellman key-pair. While the private key remains on the local proxy, the public key is broadcast to all other proxies mediated through the `server`.  That public key is used by other proxies to encrypt the individual messages.

When a user sends a message, it is broadcast to all users.  In an **unencrypted** environment *UserA* need only transmit one message for any other user to read it.  But in an *end-to-end* **encrypted** environment, using and combination of *asymmetric encryption* and *symmetric encryption*, the user needs to create individual encrypted messages for each user in the channel.

```javascript
// psuedocode
on('send_message', fn(msg){

  // for each person in the room
  everyone_in_room.forEach(fn(other_user){

    // compute shared secret, using the key-pair
    secret = my_private_key.computeSharedSecret(other_user.publickey)

    // determine a symmetric key from a hash of the shared secret
    symmetric_key = createHashSHA256(my_key)

    // create the encrypted version of the message
    encrypted_text = encryptAES256(msg, symmetric_key)

    // send the message to the server
    server.emit({
      from: 'me',
      to: other_user.id,
      msg: encrypted_text
    })

  })
})
```

The [encryption cipher](https://nodejs.org/api/crypto.html#crypto_crypto_createcipher_algorithm_password) is `aes256`.


* [browser]
* [crypto-proxy-server]
* [chat server]
* [clients]
  * [crypto-proxy-server]
  * [browser]
* [x] UI for sending messages
* [x] UI for displaying messages
* [x] crypto-proxy code for encrypting the chat messages
* [x] crypto-proxy code for decrypting the chat messages
  * [x] fix up the code for matching private and public keypairs based on the from > to



* [x] UI polish
* [ ] parameterize hostnames and ports
* [ ] crypto-proxy only binds on localhost
* [ ] docs
  * [ ] key registration
  * [ ] key cleanup
  * [ ] outgoing message
  * [ ] incoming message
* [ ] blog post





* server > proxy 'key_cleanup' {}
  * proxy - build an array of public keys from list of private keys
  * proxy - emit array of public keys to server
    * proxy > server 'allkeys' {keys: []}
