$(document).ready(function(){
	game.initialize();
	$('.button').on('click', game.reset);
});

const game = {
	board: [],
	size: 10,
	mineChance: 0.05,
	activatedTiles: 0,
	flaggedTiles: 0,
	totalMines: null,

	web3Provider: null,
	contracts: {},
	account: '0x0',

	// display info
	time: 0,
	isTimerOn: false,
	highScore: localStorage.getItem('highScore') || 0,

	initialize: async function() {
		await game.initializeWeb3();
		await game.initializeContract();
		web3.eth.getCoinbase(async function (err, account) {
			if (err !== null) {
				console.warn(err);
				return;
			}
			game.account = account;
			$('#accountAddress').html('Your Account: ' + account);

			// THIS IS FOR TEST
			// const instance = await game.contracts.Rank.deployed();
			// await instance.updatePlayer('test-user3', 45, {
			// 	from: game.account
			// });

		});

		createBoard();
		getAllNeighbors();
		clicks.enable();
		game.totalMines = countMines();


		// displays
		game.showScore(this.highScore);
		game.showCounter(this.totalMines);
		game.showTime(this.time);
	},

	initializeWeb3: function() {
		if (game.web3Provider !== null) {
			return;
		}

		if (typeof web3 !== 'undefined') {
			game.web3Provider = web3.currentProvider;
			web3 = new Web3(web3.currentProvider);
		} else {
			game.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/654c76ed876544c2bfb4575c6923212c');
			web3 = new Web3(game.web3Provider);
		}

		return;
	},

	initializeContract: function() {
		if (game.contracts.Rank !== undefined) {
			return;
		}

		$.getJSON('Rank.json', function(rank) {
			game.contracts.Rank = TruffleContract(rank);
			game.contracts.Rank.setProvider(game.web3Provider);
		});
	},

	reset: function() {
		$('.button').removeClass('shades dead');
		$('.tileContainer').remove();
		game.board = [];
		game.activatedTiles = 0;
		game.totalMines = null;
		game.gameOver = false;
		game.time = 0;
		game.highScore = localStorage.getItem('highScore') || 0;
		game.startTimer();
		game.initialize();
	},

	win: function() {
		console.log('Victory!');

		game.stopTimer();
		clicks.disable();

		eachTile((tile) => {
			if (!tile.activated && !tile.flagged) {
				tile.flag();
			}
		});

		$('.button').addClass('shades');
		game.checkScore();

		$('#transaction-confirm').show();

		game.contracts.Rank.deployed().then(function (instance) {
			instance.updatePlayer($('#nickname').val(), game.time, {
				from: game.account
			}).then(function () {
				$('#transaction-confirm').hide();
			}).catch(function (error) {
				console.warn(error);
				$('#transaction-confirm').hide();
			});
		});
	},

	lose: function() {
		game.gameOver = true;
		game.stopTimer();
		clicks.disable();

		eachTile((tile) => {
			if (tile.hasMine && !tile.flagged) {
				tile.activate();
			}
		});

		$('.button').addClass('dead');
	},

	checkScore: function() {
		if (game.time < game.highScore) {
			localStorage.setItem('highScore', game.time);
		}
	},

	// timer methods
	startTimer: function() {
		window.timerID = setInterval(game.updateTimer, 1000);
		game.isTimerOn = true;
	},

	updateTimer: function() {
		game.time++;
		game.showTime(game.time);
	},

	stopTimer: function() {
		clearInterval(timerID);
		game.isTimerOn = false;
	},

	// displays methods
	showScore: function(score) {
		$('.display-score').html('<tr><td>SCORE: ' + score + '</td></tr>');
	},

	showCounter: function(mines) {
		$('.display-counter').html('<tr><td>MINES: ' + mines + '</td></tr>');
	},

	showTime: function(time) {
		$('.display-timer').html('<tr><td>TIME: ' + time + '</td></tr>');
	}
};

const clicks = {
	enable: function() {
		var $tile = $('.tile');
		$tile.on('click', async function (event) {

			// start timer
			if(!game.isTimerOn) game.startTimer();

			let tile = getTileByEvent(event);
			if (tile.activated && (tile.sumNeighbors('flagged') === tile.sumNeighbors('hasMine'))) {
				await tile.activateNeighbors();
			} else {
				tile.activate();
			}
		});
		$tile.on('contextmenu', function(e){
			return false;
		}); // WTF??
		$tile.on('contextmenu', function(event) {
			let tile = getTileByEvent(event);
			if (tile.activated && (tile.sumNeighbors('flagged') === tile.sumNeighbors('hasMine'))) {
				// why do we call this again? already been called in click event
				tile.activateNeighbors();
			} else {
				tile.flag();
			}
		});
	},
	disable: function() {
		var $tile = $('.tile');
		$tile.off('click');
		$tile.off('contextmenu');
		$tile.on('contextmenu', () => {return false});
	}
};

function createBoard() {
	var htmlStr = "<div class='tileContainer'>";
	for (var r = 0; r < game.size; r++) {
		htmlStr += "<div class='row'>";
		game.board.push([]);
		for (var c = 0; c < game.size; c++) {
			htmlStr += "<div class='tile' coordinates='" + r + " " + c + "'></div>";
			game.board[r].push(new Tile(r, c));
		}
		htmlStr += "</div>"
	}
	htmlStr += "</div>";
	$("#content").append(htmlStr);
	$("#loader").hide();
	$("#transaction-confirm").hide();
}

class Tile {
	constructor(r, c) {
		this.r = r;
		this.c = c;
		this.coordinates = '[coordinates="' + r + ' ' + c + '"]';
		this.hasMine = game.mineChance > Math.random();
		this.neighbors = null;
		this.flagged = false;
	}

	activate() {
		if (!this.activated && !this.flagged) {
			this.activated = true;
			game.activatedTiles++;
			let mineCount = this.sumNeighbors('hasMine');
			if(this.hasMine) {
				$(this.coordinates).addClass('exploded activated');

				game.lose();
			} else {
				$(this.coordinates).addClass('mines' + mineCount + ' activated');
				if (mineCount === 0) {
					this.activateNeighbors();
					} else {
					$(this.coordinates).text(mineCount);
				}
				if (!game.gameOver && ( game.activatedTiles + game.totalMines === (game.size * game.size)) ) {
					game.win();
				}
			}
		}
	}

	flag() {
		if (!this.activated && (game.totalMines - game.flaggedTiles) > 0){
			this.flagged ? game.flaggedTiles-- : game.flaggedTiles++;
			this.flagged = !this.flagged;
			$(this.coordinates).toggleClass('flagged');

			// update and show counter
			game.showCounter(game.totalMines - game.flaggedTiles);
		}
	}


	getNeighbors(){
		let neighbors = [];
		for (var r = this.r - 1; r <= this.r + 1; r++) {
			for (var c = this.c - 1; c <= this.c + 1; c++) {
				if(onBoard(r, c)) {
					neighbors.push(game.board[r][c]);
				};
			}
		}
		this.neighbors = neighbors;
	}

	sumNeighbors(prop) {
		return this.neighbors.reduce( (sum, neighborTile) => {return sum + neighborTile[prop]}, 0);
	}

	activateNeighbors() {
		this.neighbors.forEach(async function(neighborTile) {
			neighborTile.activate();
		})
	}
}

function getAllNeighbors() {
	for (var r = 0; r < game.size; r++) {
		for (var c = 0; c < game.size; c++) {
			getTile(r, c).getNeighbors();
		}
	}
}

function countMines() {
	var sum = 0;
	eachTile(function(tile) {
		sum += tile.hasMine;
	})
	return sum;
}

function onBoard (r, c) {
	return r >= 0 && r < game.size && c >= 0 && c < game.size;
}

function getTile(r, c) {
	return game.board[r][c];
}

function getTileByEvent(event) {
	let coordinates = $(event.target).attr('coordinates')
		.split(' ')
		.map( el => +el );
	return getTile(...coordinates)
}

function eachTile(callback) {
	for (var r = 0; r < game.size; r++) {
		for (var c = 0; c < game.size; c++) {
			callback(getTile(r, c));
		}
	}
}
