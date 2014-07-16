/*
MultiSnake pickup implementation
by Steven Gunneweg
*/

Pickup.types = {
	point: {
		type: 'point',
		color: 'white'
	},
	speed: {
		type: 'speed',
		color: 'rgb(255, 100, 100)',
		duration: 5,
		speed: 0.1
	},
	slow: {
		type: 'slow',
		color: 'rgb(100, 255, 100)',
		duration: 5,
		speed: -0.1
	}
}
function Pickup() {
	var _x = 0,
		_y = 0,
		_type = null,
		_color = null,
		_active = true;

	var newPickup = function(type) {
		if (!type)
			type = Pickup.types.point;
		_type = type;
		_x = Math.random() * (MultiSnake.canvasSize.w - thirdOfPlayerSize());
		_y = Math.random() * (MultiSnake.canvasSize.h - thirdOfPlayerSize());
	}
	var thirdOfPlayerSize = function() {
		return (MultiSnake.playerSize / 4) * 3;
	}

	this.draw = function(context) {
		context.save();

		if (_active) {
			drawCircle(context, _x, _y, thirdOfPlayerSize(), thirdOfPlayerSize(), _type.color, null, 10);
		} else {
			drawCircle(context, _x, _y, thirdOfPlayerSize(), thirdOfPlayerSize(), 'rgb(100, 100, 100)', null, 10);
		}

		context.restore();
	}
	this.init = function(type) {
		newPickup(type);
	}
	this.getPickup = function() {
		return {
			x: _x,
			y: _y,
			width: thirdOfPlayerSize(),
			height: thirdOfPlayerSize(),
			type: _type,
			active: _active
		}
	}
	this.getType = function() {
		return _type;
	}
	this.setPickup = function(object) {
		_x = object.x;
		_y = object.y;
		_type = object.type;
		_active = object.active;
	}
	this.setActive = function(value) {
		_active = value;
	}
	this.isActive = function() {
		return _active;
	}
}