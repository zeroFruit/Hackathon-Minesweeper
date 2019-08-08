App = {
  web3Provider: null,
  contracts: {},
  rendering: false,

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (typeof web3 === 'undefined') {
      App.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/654c76ed876544c2bfb4575c6923212c');
      web3 = new Web3(App.web3Provider);
    } else {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Rank.json', function(rank) {
      App.contracts.Rank = TruffleContract(rank);
      App.contracts.Rank.setProvider(App.web3Provider);
      App.listenForEvents();

      return App.render();
    });
  },

  render: async function () {
    if (App.rendering) {
      return;
    }
    App.rendering = true;

    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $('#accountAddress').html('Your Account: ' + account);
      }
    });

    const instance = await App.contracts.Rank.deployed();

    var playerRanks = $('#playerRanks');
    playerRanks.empty();

    const size = (await instance.getPlayersSize()).toNumber();

    for (var i = 1; i <= size; i++) {
      const _id = await instance.playerLUT(i-1);
      const _player = await instance.players(_id);
      const addr = _player[0];
      const nickname = _player[1];
      const time = _player[2];

      const playerTemplate = "<tr><th>" + i + "</th><td>" + addr + "</td><td>" + nickname + "</td><td>" + time + "</td></tr>";
      playerRanks.append(playerTemplate);
    }

    loader.hide();
    content.show();

    App.rendering = false;
  },

  listenForEvents: async function () {
    App.contracts.Rank.deployed().then(async function (instance) {
      instance.playerRankUpdated({}, {
        fromBlock: 'latest',
        toBlock: 'latest',
      }).watch(async function (error, event) {
        console.log('event triggered', event);
        if (error !== null) {
          console.warn(error);
        }
        // Reload when a new vote is recoreded
        await App.render();
      });
    });
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});

function range(start, end) {
  var result = [];
  for (var i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}
