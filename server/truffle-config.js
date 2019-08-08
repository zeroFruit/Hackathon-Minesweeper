const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    develop: {
      port: 8545
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC, 'https://ropsten.infura.io/v3/654c76ed876544c2bfb4575c6923212c');
      },
      network_id: 3,
      gas: 4000000,
    }
  }
};
