pragma solidity ^0.5.0;

contract Rank {
    event playerRankUpdated(uint indexed _id, address indexed _addr, string _nickname, uint indexed _time);

    struct Player {
        address addr;
        string nickname;
        uint time;
    }

    mapping(uint => Player) public players;

    uint[] public playerLUT;

    uint public playersCount;

    function updatePlayer(string memory _nickname, uint _time) public {
        require(_time > 0);

        playersCount++;
        players[playersCount] = Player(msg.sender, _nickname, _time);
        playerLUT.push(playersCount);

        emit playerRankUpdated(playersCount, msg.sender, _nickname, _time);
    }

    function getPlayersSize() view public returns (uint) {
        return playerLUT.length;
    }
}
