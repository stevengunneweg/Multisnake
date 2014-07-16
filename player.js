/*
MultiSnake player implementation
by Steven Gunneweg
*/

Player.colors = [
	"red",
	"green",
	"blue",
	"yellow",
	"cyan",
	"chartreuse",
	"orange",
	"white",
	"deeppink",
	"darkorange"
];

function Player() {
	var _x = 0,
		_y = 0,
		_score = 0,
		_direction = 0,
		_speed = 0,
		_color = null,
		_tail = [],
		_desired_direction = null,
		_pickupTimers = {},
		_pickupTimeouts = {},
		_active = true;


	var newPlayer = function(color) {
		_x = Math.random() * (MultiSnake.canvasSize.w - MultiSnake.playerSize);
		_y = Math.random() * (MultiSnake.canvasSize.h - MultiSnake.playerSize);
		_score = 0;
		_direction = 0;
		_speed = 0.3;
		_color = color || Player.colors[Math.round(Math.random() * (Player.colors.length - 1))];
		// _color = color || 'rgb(' + (Math.round(Math.random() * 100) + 150) + ', ' + (Math.round(Math.random() * 100) + 150) + ', ' + (Math.round(Math.random() * 100) + 150) + ')',
		_tail = [];
		_pickupTimers = {};
		_pickupTimeouts = {};
	}
	var updateTailEnd = function() {
		var tailLength = getTailLength();

		var tail_tip = _tail[0];
		if (tailLength >= _score * MultiSnake.playerSize && tail_tip) {
			switch (tail_tip.direction) {
				case MultiSnake.directions.up:
					if (tailLength - (_score * MultiSnake.playerSize) >= _speed) {
						tail_tip.height -= tailLength - (_score * MultiSnake.playerSize);
					}
					break;
				case MultiSnake.directions.down:
					if (tailLength - (_score * MultiSnake.playerSize) >= _speed) {
						tail_tip.height -= tailLength - (_score * MultiSnake.playerSize);
						tail_tip.y += tailLength - (_score * MultiSnake.playerSize);
					}
					break;
				case MultiSnake.directions.left:
					if (tailLength - (_score * MultiSnake.playerSize) >= _speed) {
						tail_tip.width -= tailLength - (_score * MultiSnake.playerSize);
					}
					break;
				case MultiSnake.directions.right:
					if (tailLength - (_score * MultiSnake.playerSize) >= _speed) {
						tail_tip.width -= tailLength - (_score * MultiSnake.playerSize);
						tail_tip.x += tailLength - (_score * MultiSnake.playerSize);
					}
					break;
			}
			if (tail_tip.width < MultiSnake.playerSize || tail_tip.height < MultiSnake.playerSize) {
				_tail = _tail.splice(1, _tail.length - 1);
			}
		}
	}
	var getTailLength = function() {
		var tail_length = 0;
		for (var index = 0; index < _tail.length; index++) {
			var tail = _tail[index];
			if (tail.direction == MultiSnake.directions.left || _tail[index].direction == MultiSnake.directions.right) {
				tail_length += _tail[index].width - MultiSnake.playerSize;
			} else if (tail.direction == MultiSnake.directions.up || _tail[index].direction == MultiSnake.directions.down) {
				tail_length += _tail[index].height - MultiSnake.playerSize;
			}
		}
		return tail_length;
	}
	var canTurnTo = function(new_direction) {
		//Prevent instant turn
		if (new_direction != _direction && new_direction != -_direction) {
			var second_last_tail = _tail[_tail.length - 2];
			if (second_last_tail) {
				if (second_last_tail.direction == new_direction || second_last_tail.direction == -new_direction) {
					if (new_direction == MultiSnake.directions.up || new_direction == MultiSnake.directions.down) {
						if (Math.abs(second_last_tail.x - _x) <= MultiSnake.playerSize) {
							_desired_direction = new_direction;
							return false;
						}
					} else if (new_direction == MultiSnake.directions.left || new_direction == MultiSnake.directions.right) {
						if (Math.abs(second_last_tail.y - _y) <= MultiSnake.playerSize) {
							_desired_direction = new_direction;
							return false;
						}
					}
				}
			}
			return true;
		} else {
			return false;
		}
	}

	this.init = function (color) {
		newPlayer(color);
	}
	this.update = function(delta_time) {
		if (_desired_direction) {
			if (canTurnTo(_desired_direction)) {
				this.setDirection(_desired_direction);
				_desired_direction = null;
			}
		}

		updateTailEnd();
		if (_x > 0 && _x < MultiSnake.canvasSize.w - MultiSnake.playerSize && _y > 0 && _y < MultiSnake.canvasSize.h - MultiSnake.playerSize) {
			//Update position and latest tail section
			if (_speed <= 0) {
				_speed = 0.05;
			}
			switch (_direction) {
				case MultiSnake.directions.left:
					_x -= _speed * delta_time;
					_tail[_tail.length - 1].width += _speed * delta_time;
					_tail[_tail.length - 1].x -= _speed * delta_time;
					break;
				case MultiSnake.directions.right:
					_x += _speed * delta_time;
					_tail[_tail.length - 1].width += _speed * delta_time;
					break;
				case MultiSnake.directions.up:
					_y -= _speed * delta_time;
					_tail[_tail.length - 1].height += _speed * delta_time;
					_tail[_tail.length - 1].y -= _speed * delta_time;
					break;
				case MultiSnake.directions.down:
					_y += _speed * delta_time;
					_tail[_tail.length - 1].height += _speed * delta_time;
					break;
			}
		} else {
			this.init(_color);
		}
	}
	this.draw = function(context) {
		context.save();

		if (_active) {
			drawRect(context, _x, _y, MultiSnake.playerSize, MultiSnake.playerSize, _color, null, 5);
			for (var index = 0; index < _tail.length; index++) {
				var tail = _tail[index];
				drawRect(context, tail.x, tail.y, tail.width, tail.height, _color, null, 5);
			}

			if ((Object.keys(_pickupTimers).length) > 0) {
				var y = 0;
				for (var id in _pickupTimers) {
					if (_pickupTimers[id] > 0) {
						context.font = "20px Arial";
						context.textAlign = 'center';
						context.fillStyle = 'black';
						context.fillText(_pickupTimers[id], _x + (MultiSnake.playerSize / 2), _y + (MultiSnake.playerSize / 2) + 10 - y);
						y += 15;
					}
				}
			}
		} else {
			drawRect(context, _x, _y, MultiSnake.playerSize, MultiSnake.playerSize, 'rgb(100, 100, 100)', null, 5);
		}

		context.restore();
	}
	this.getPlayer = function() {
		return {
			speed: _speed,
			x: _x,
			y: _y,
			width: MultiSnake.playerSize,
			height: MultiSnake.playerSize,
			direction: _direction,
			color: _color,
			score: _score,
			tail: _tail,
			timer: _pickupTimers,
			active: _active
		};
	}
	this.setPlayer = function(object) {
		_speed = object.speed;
		_x = object.x;
		_y = object.y;
		_direction = object.direction;
		_color = object.color;
		_score = object.score;
		_tail = object.tail;
		_pickupTimer = object.timer;
		_active = object.active;
	}
	this.getPosition = function() {
		return {
			x: _x,
			y: _y
		};
	}
	this.setPosition = function(position) {
		_x = position.x;
		_y = position.y;
	}
	this.getTail = function() {
		return _tail;
	}
	this.increaseScore = function(amount) {
		_score += amount;
	}
	this.getColor = function() {
		return _color;
	}
	this.setColor = function(color) {
		_color = color;
	}
	this.setSpeedForDuration = function(speed, duration) {
		var timer_id = Math.random() * 500;
		_speed += speed;
		_pickupTimers[timer_id] = duration;
		_pickupTimeouts[timer_id] = setInterval(function() {
			_pickupTimers[timer_id]--;
			if (_pickupTimers[timer_id] == 0) {
				clearInterval(_pickupTimeouts[timer_id]);
				delete _pickupTimers[timer_id];
				delete _pickupTimeouts[timer_id];
				_speed -= speed;
			}
		}, 1000);
	}
	this.getDirection = function() {
		return _direction;
	}
	this.getPickupTimer = function() {
		return _pickupTimer;
	}
	this.setPickupTimer = function(value) {
		_pickupTimer = value;
	}
	this.setDirection = function(new_direction) {
		if (canTurnTo(new_direction)) {
			var direction = _direction;
			switch (new_direction) {
				case MultiSnake.directions.up:
					if (_direction != MultiSnake.directions.down)
						_direction = MultiSnake.directions.up;
					break;
				case MultiSnake.directions.down:
					if (_direction != MultiSnake.directions.up)
						_direction = MultiSnake.directions.down;
					break;
				case MultiSnake.directions.left:
					if (_direction != MultiSnake.directions.right)
						_direction = MultiSnake.directions.left;
					break;
				case MultiSnake.directions.right:
					if (_direction != MultiSnake.directions.left)
						_direction = MultiSnake.directions.right;
					break;
			}
			_tail.push({ x: _x, y: _y, width: MultiSnake.playerSize, height: MultiSnake.playerSize, direction: _direction });
		}
	}
	this.setActive = function(value) {
		_active = value;
	}
	this.isActive = function() {
		return _active;
	}
}