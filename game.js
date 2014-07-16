/*
MultiSnake game implementation
by Steven Gunneweg

Client creates a MultiSnake instance.
Client calls 'init()' method create a canvas and initialize the game.
Client implements:
	<MultiSnake instance>.updated = function() {}	//called after the game update is completed.
	<MultiSnake instance>.pickedUpRemote = function() {} //called after the pickup from a remote player is picked up.
Client calls:
	<MultiSnake instance>.changeDirection(<MultiSnake instance>.direction.<direction>) //changes the direction of the player
*/
MultiSnake.directions = {
	up: -1,
	down: 1,
	left: -2,
	right: 2,
};
MultiSnake.canvasSize = {w: 600, h: 600};
MultiSnake.playerSize = 40;
function MultiSnake() {
	// Private variables
	var canvas = null,
		context = null,
		running = false,
		paused = false,
		self = this,

		pickups = {},
		players = {},
		local_id = -1,
		respawn_timeframe = 100000,
		started = false,
		colors = [],
		changed_allready = false,
		mspf = 0,
		prevTime = 0;

	var currentTime = 0,
		delta = 0,
		lastTime = (new Date()).getTime(),
		fps = 60,
		cur_fps = 0,
		interval = 1000 / fps;

	// Public variables
	// Public variables to be implemented in parent
	this.updated = null;
	this.pickedUpRemote = null;

	// Private methods
	var handleCollision = function() {
		//Collision Player - Player_tail
		for (var opponent_id in players) {
			var opponent = players[opponent_id].getPlayer();
			if (players[opponent_id].isActive() && players[local_id].isActive()) {
				for (var i = 0; i < opponent.tail.length - ((opponent_id == local_id) ? 2 : 0); i++) {
					var tail = opponent.tail[i];
					if (collisionBetweenSquares(players[local_id].getPlayer(), tail)) {
						players[local_id].init(players[local_id].getColor());
					}
				}
			}
		}
		//Collision Player - Pickup
		for (var _id in pickups) {
			for (var index = 0; index < pickups[_id].length; index++) {
				if (pickups[_id][index].isActive()) {
					if (collisionBetweenSquares(players[local_id].getPlayer(), pickups[_id][index].getPickup())) {
						handlePickup(_id, index, true);
					}
				}
			}
		}
	}
	var update = function() {
		// Unique color code
		for (var id in players) {
			if (id == local_id)
				continue;
			colors.push(players[id].getPlayer().color);
		}
		if (colors.length > 0 && !changed_allready) {
			var should_change = false;
			for (var i = 0; i < colors.length; i++) {
				if (players[local_id].getPlayer().color == colors[i]) {
					should_change = true;
				}
			}
			if (should_change) {
				changed_allready = true;
				players[local_id].setColor(Player.colors[Math.round(Math.random() * (Player.colors.length - 1))]);
			}
		}

		currentTime = (new Date()).getTime();
	    delta = (currentTime - lastTime);

	    if(delta > interval) {
	    	mspf = currentTime - prevTime;
	    	prevTime = currentTime;
			cur_fps = Math.round(1000 / ((currentTime - (delta % interval)) - lastTime));

			if (running) {
				MultiSnake.playerSize = 40 - (Object.keys(players).length * 5);
				players[local_id].update(mspf);

				handleCollision();

				if (self.updated)
					self.updated();
			}
			draw();

        	lastTime = currentTime - (delta % interval);
		}
		requestAnimationFrame(update.bind(this));
	}
	var draw = function() {
		//Clear canvas
		context.clearRect(0, 0, canvas.width, canvas.height);
		//Create border
		context.save();
		drawRect(context, 0, 0, MultiSnake.canvasSize.w, MultiSnake.canvasSize.h, 'rgb(50, 50, 50)', 'white', 10);
		context.restore();

		if (running) {
			//Draw all pickups
			for (var _id in pickups) {
				for (var index = 0; index < pickups[_id].length; index++) {
					pickups[_id][index].draw(context);
				}
			}
			//Draw all players
			for (var _id in players) {
				players[_id].draw(context);
			}

			//Draw which player you are if not moving
			player = players[local_id].getPlayer();
			if (player.direction == 0) {
				if (player.x < (MultiSnake.canvasSize.w / 2) + (player.width / 2)) {
					canvas_arrow(context, player.x + (MultiSnake.playerSize * 2), player.y + (MultiSnake.playerSize / 2), player.x + MultiSnake.playerSize + 5, player.y + (MultiSnake.playerSize / 2));
					context.font="20px arial";
					context.fillStyle="rgb(230,230,230)";
					context.fillText("You", player.x + (MultiSnake.playerSize * 2) + 5, player.y + MultiSnake.playerSize - 10);
				} else {
					canvas_arrow(context, player.x - MultiSnake.playerSize, player.y + (MultiSnake.playerSize / 2), player.x - 5, player.y + (MultiSnake.playerSize / 2));
					context.font="20px arial";
					context.textAlign = 'right';
					context.fillStyle="rgb(230,230,230)";
					context.fillText("You", player.x - MultiSnake.playerSize - 5, player.y + MultiSnake.playerSize - 10);
				}
			}
		} else {
			context.font="40px Arial";
			context.textAlign = 'center';
			context.fillStyle = "rgb(230,230,230)";
			context.fillText('Connecting...', MultiSnake.canvasSize.w / 2, MultiSnake.canvasSize.h / 2 - 20);
		}
		context.font="20px Arial";
		context.textAlign = 'left';
		context.fillText('fps: ' + cur_fps, 10, 20);
	}
	var createCanvas = function() {
		canvas = document.createElement("canvas");
		context = canvas.getContext("2d");
		canvas.width = MultiSnake.canvasSize.w;
		canvas.height = MultiSnake.canvasSize.h;
		document.getElementById("container").appendChild(canvas);
	}
	var collisionBetweenSquares = function (a, b) {
		if (a.x <= b.x + b.width  && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y) {
			return true;
		}
		return false;
	}
	var handlePickup = function(pickup_id, pickup_index, is_local_player) {
		switch (pickups[pickup_id][pickup_index].getType().type) {
			case Pickup.types.point.type:
				if (is_local_player) {
					players[local_id].increaseScore(1);
				}
				if (pickup_id == local_id) {
					pickups[pickup_id][pickup_index].init(pickups[pickup_id][pickup_index].getType());
				}
				break;
			case Pickup.types.speed.type:
				if (is_local_player) {
					players[local_id].setSpeedForDuration(Pickup.types.speed.speed, Pickup.types.speed.duration);

					canSpawnPickup(Pickup.types.speed);
				}
				if (pickup_id == local_id) {
					pickups[local_id].splice(pickup_index,1);
				}
				break;
			case Pickup.types.slow.type:
				if (is_local_player) {
					players[local_id].setSpeedForDuration(Pickup.types.slow.speed, Pickup.types.slow.duration);

					canSpawnPickup(Pickup.types.slow);
				}
				if (pickup_id == local_id) {
					pickups[local_id].splice(pickup_index,1);
				}
				break;
			default:
				break;
		}
		if (pickup_id != local_id) {
			if (self.pickedUpRemote) {
				self.pickedUpRemote(pickup_id, pickup_index);
			}
		}
	}
	var canSpawnPickup = function(type) {
		setTimeout(function() {
			pickups[local_id].push(new Pickup());
			pickups[local_id][pickups[local_id].length - 1].init(type);
			pickups[local_id][pickups[local_id].length - 1].setActive(!paused);
		}, Math.random() * respawn_timeframe);
	}

	// Public methods
	this.init = function() {
		createCanvas();
		players[local_id] = new Player();
		players[local_id].init(null);
		
		pickups[local_id] = [];
		pickups[local_id].push(new Pickup());
		pickups[local_id][0].init(Pickup.types.point);

		requestAnimationFrame(update.bind(this));
	}
	this.startGame = function() {
		if (!started) {
			started = true;
			running = true;

			canSpawnPickup(Pickup.types.speed);
			canSpawnPickup(Pickup.types.slow);
		}
	}
	this.changeDirection = function(new_direction) {
		players[local_id].setDirection(new_direction);
	}
	//Get, Set, Remove remote opponents
	this.getOpponents = function() {
		return players;
	}
	this.setOpponent = function(id, opponent) {
		if (!players[id])
			players[id] = new Player();
		players[id].setPlayer(opponent);
	}
	this.removeOpponent = function(id) {
		delete players[id];
	}
	//Get local player
	this.getPlayer = function() {
		return players[local_id].getPlayer();
	}

	//Get, Set, Remove remote pickups
	this.setPickups = function(id, _pickups) {
		pickups[id] = [];
		for (var index = 0; index < _pickups.length; index++) {
			pickups[id].push(new Pickup());
			pickups[id][index].setPickup(_pickups[index]);
		}
	}
	this.removePickups = function(id) {
		delete pickups[id];
	}
	//Get, Set local pickup
	this.getPickups = function() {
		ret_val = [];
		for (var pickup_id in pickups[local_id]) {
			ret_val.push(pickups[local_id][pickup_id].getPickup());
		}
		return ret_val;
	}
	this.setLocalPickups = function(pickup_id) {
		if (pickups[local_id][pickup_id]) {
			handlePickup(local_id, pickup_id, false);
		}
	}

	this.pause = function() {
		// running = false;
		paused = true;
		players[local_id].setActive(false);
		for (var i = 0; i < pickups[local_id].length; i++) {
			pickups[local_id][i].setActive(false);
		}
	}
	this.unpause = function() {
		// running = true;
		paused = false;
		players[local_id].setActive(true);
		for (var i = 0; i < pickups[local_id].length; i++) {
			pickups[local_id][i].setActive(true);
		}
	}
};