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
* [x] parameterize hostnames and ports
* [ ] crypto-proxy only binds on localhost
* [ ] docs
  * [ ] key registration
  * [ ] key cleanup
  * [x] outgoing message
  * [x] incoming message
* [ ] blog post





* server > proxy 'key_cleanup' {}
  * proxy - build an array of public keys from list of private keys
  * proxy - emit array of public keys to server
    * proxy > server 'allkeys' {keys: []}
