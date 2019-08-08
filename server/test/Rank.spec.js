const Rank = artifacts.require('../contracts/Rank.sol');

contract('Rank', (accounts) => {
  let rankInstance;

  beforeEach(async () => {
    rankInstance = await Rank.deployed();
  });

  describe('#updatePlayer()', () => {
    it('should successfully players mapping and emit event', async () => {
      const nickname = 'my-player';
      const time = 1;
      const {logs} = await rankInstance.updatePlayer(nickname, time, {
        from: accounts[0],
      });
      assert.equal(logs[0].event, 'playerRankUpdated');
      assert.equal(logs[0].args._id, 1);
      assert.equal(logs[0].args._addr, accounts[0]);
      assert.equal(logs[0].args._nickname, nickname);
      assert.equal(logs[0].args._time, time);

      const playerId = await rankInstance.playerLUT(0);
      assert.equal(playerId, 1);

      const playersSize = await rankInstance.getPlayersSize();
      assert.equal(playersSize, 1);

      const player = await rankInstance.players(1);
      assert.equal(player.addr, accounts[0]);
      assert.equal(player.nickname, nickname);
      assert.equal(player.time, time);
    });
  });
});
