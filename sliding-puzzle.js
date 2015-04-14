moveDirection = {
	NONE:		0,
	UP:			1,
	RIGHT:		2,
	DOWN:		3,
	LEFT:		4
};

function SlidingPuzzle(options){
	_this = this;
	
	_width = 0;
	_height = 0;
	
	_wrapperClass = '.' + options.wrapperClass;
	_elementClass = '.' + options.elementClass;
	_playClass = '.' + options.playButton;
	_pauseClass = '.' + options.pauseButton;
	_resetClass = '.' + options.resetButton;
	
	_activeProperties = options.activeProperties;
	_inactiveProperties = options.inactiveProperties;
	
	_playInterval = options.playInterval > 1000 ? options.playInterval : 1000;
	_intervalHandler = null;
	_transitionDuration = _playInterval < options.animDuration ? 500 : options.animDuration;
	_state = 0;
	_tileIsMoving = false;
	_introPlayed = false;
	_lastMove = moveDirection.NONE;
	
	_coverImage = options.coverBackgroundURL;
	_tilesImage = options.tilesBackgroundURL;
	
	_flipOnVisible = options.flipOnVisible || false;
	_pauseOnBlur = options.pauseOnBlur || true;
	
	_rows = options.rows > 2 ? options.rows : 2 ;
	_columns = options.columns > 2 ? options.columns : 2 ;
	
	_tilesWidth = 0;
	_tilesHeight = 0;
	_tilesNumber = _rows * _columns;

	_emptyTileIndex = options.emptyTileIndex >= 0 ? options.emptyTileIndex : 0;
	_defaultEmptyTileIndex = _emptyTileIndex;
	
	_backgroundSectionOffsets = [];
	_tileOffsets = [];
	_tiles = []
	_coverSections = [];
	_backgroundSections = [];
	
	_drag = {
		elem: null,
		x: 0,
		y: 0,
		state: 0,
		direction:	moveDirection.NONE,
		maxDistance: 0,
		revertOffset:	30,
		lastOffset: null
	};
	
	_touchEvent = {
		startX:	0,
		startY:	0,
		endX:	0,
		endY:	0
	};
	
	this.init();
	
	this.bindEvents();
	
	if (!_flipOnVisible)
		setTimeout(function() {
			_this.flip();
		}, _transitionDuration*2);
	
}

SlidingPuzzle.prototype.getMovementDirection = function(offset) {
	var emptyOffset = _backgroundSectionOffsets[_emptyTileIndex];

	if (Math.round(emptyOffset.top) == Math.round(offset.top)) // same row
	{
		if (offset.left < emptyOffset.left && Math.round(emptyOffset.left - offset.left) <= Math.ceil(_tilesWidth) ) // empty is on the right
			return moveDirection.RIGHT;
		
		if (offset.left > emptyOffset.left && Math.round(offset.left - emptyOffset.left) <= Math.ceil(_tilesWidth) ) // empty is on the left
			return moveDirection.LEFT;
	}
	else if (Math.round(emptyOffset.left) == Math.round(offset.left)) // same column
	{
		if (offset.top > emptyOffset.top && Math.round(offset.top - emptyOffset.top) <= Math.ceil(_tilesHeight)) // empty is on top
			return moveDirection.UP;
		
		if (offset.top < emptyOffset.top && Math.round(emptyOffset.top - offset.top) <= Math.ceil(_tilesHeight)) // empty is on bottom
			return moveDirection.DOWN;
	}
	
	return moveDirection.NONE;
}

SlidingPuzzle.prototype.init = function() {
	$(_wrapperClass).css('position', 'relative');
	_width = $(_wrapperClass).width();
	
	$(_elementClass).each(function(index) {
		
		if (index == 0)
		{
			_tilesWidth = $(this).outerWidth();
			_tilesHeight = $(this).outerHeight();
		}
		
		_backgroundSectionOffsets.push({
			top:	$(this).position().top,
			left:	$(this).position().left
		});
		
		_tileOffsets.push({
			top:	$(this).position().top,
			left:	$(this).position().left
		});

	});
	
	_height = _tilesHeight * _rows;
	
	$(_wrapperClass).append(_this.createTiles());
	_this.setElementsCSS();
}

SlidingPuzzle.prototype.bindEvents = function() {
	this.bindDocumentReady();
	this.bindMouseDown();
	this.bindMouseMove();
	this.bindMouseUp();
	this.bindTouchEvents();
	
	this.bindWindowScroll();
	this.bindWindowResize();
	this.bindWindowBlur();
	
	this.bindConsole();
}

SlidingPuzzle.prototype.bindMouseDown = function() {
	$(_tiles).each(function() {
		$(this).on('mousedown', function(e) {
			if (!_drag.state && !_tileIsMoving && e.which == 1) {
				_drag.elem = this;
				_drag.x = e.pageX;
				_drag.y = e.pageY;
				_drag.state = 1;
				$(this).css({transition: 'none'});
				e.preventDefault();
				_this.stopAutoPlay();
			}
			return false;
		});
	});
}

SlidingPuzzle.prototype.bindTouchEvents = function() {
	$(_tiles).bind('touchstart', function(e) {
		var touch = e.originalEvent.changedTouches[0];
		_touchEvent.startX = touch.pageX;
		_touchEvent.startY = touch.pageY;
		
		_this.stopAutoPlay();
		e.preventDefault();
	});
	
	$(_tiles).bind('touchend', function(e) {
		var touch = e.originalEvent.changedTouches[0];
		_touchEvent.endX = touch.pageX;
		_touchEvent.endY = touch.pageY;
		
		var distanceX = _touchEvent.endX - _touchEvent.startX;
		var distanceY = _touchEvent.endY - _touchEvent.startY;
		var direction = _this.getMovementDirection($(this).position());
		
		var oldEmpty = _emptyTileIndex;
		var canMove = false;
		
		if (Math.abs(distanceX) > Math.abs(distanceY)) // horizontal swipe
		{
			if (distanceX > 0 && direction == moveDirection.RIGHT) // right swipe
			{
				_emptyTileIndex--;
				canMove = true;
			}
			
			else if (distanceX < 0 && direction == moveDirection.LEFT) // left swipe
			{
				_emptyTileIndex++;
				canMove = true;
			}
		}
		else 											// vertical swipe
		{
			if (distanceY > 0 && direction == moveDirection.DOWN) // bottom swipe
			{
				_emptyTileIndex -= _columns;
				canMove = true;
			}
			
			else if (distanceY < 0 && direction == moveDirection.UP) // top swipe
			{
				_emptyTileIndex += _columns;
				canMove = true;
			}
		}
		
		if (canMove)
			$(this).css({
				top:	_backgroundSectionOffsets[oldEmpty].top,
				left:	_backgroundSectionOffsets[oldEmpty].left
			});
		
		_touchEvent = {
			startX:	0,
			startY:	0,
			endX:	0,
			endY:	0
		};
	});
}

SlidingPuzzle.prototype.bindMouseMove = function() {
	$(document).on('mousemove', function(e) {
		
		if (_drag.state == 0 || _tileIsMoving)
			return;
		
		e.preventDefault();
		var offsetType = ' ';
		var offsetPos = ' ';
		var offset = $(_drag.elem).position();
		var diffX = e.pageX - _drag.x;
		var diffY = e.pageY - _drag.y;
		
		if (_drag.direction == moveDirection.NONE && _drag.lastOffset == null)
		{
			_drag.direction = _this.getMovementDirection(offset);
			switch(_drag.direction)
			{
				case moveDirection.UP: 		_drag.lastOffset =  _backgroundSectionOffsets[_emptyTileIndex + _columns]; 	break;
				case moveDirection.DOWN: 	_drag.lastOffset =  _backgroundSectionOffsets[_emptyTileIndex - _columns]; 	break;
				case moveDirection.LEFT: 	_drag.lastOffset =  _backgroundSectionOffsets[_emptyTileIndex + 1]; 		break;
				case moveDirection.RIGHT: 	_drag.lastOffset =  _backgroundSectionOffsets[_emptyTileIndex - 1]; 	break;
			}
		}
		
		
		
		
		var emptyOffset = _backgroundSectionOffsets[_emptyTileIndex];
		
		switch(_drag.direction)
		{
			case moveDirection.UP: 
				if (offset.top + diffY >= emptyOffset.top && offset.top + diffY <= _drag.lastOffset.top)
				{
					offsetPos = '+=' + diffY;
					offsetType = 'top';
					_drag.maxDistance = Math.max(_drag.maxDistance - diffY, _drag.maxDistance);
				}
			break;
			case moveDirection.DOWN:
				if (offset.top + diffY <= emptyOffset.top && offset.top + diffY >= _drag.lastOffset.top)
				{
					offsetPos = '+=' + diffY;
					offsetType = 'top';
					_drag.maxDistance = Math.max(diffY - _drag.maxDistance, _drag.maxDistance);
				}
			break;
			case moveDirection.LEFT:
				if (offset.left + diffX >= emptyOffset.left && offset.left + diffX <= _drag.lastOffset.left)
				{
					offsetPos = '+=' + diffX;
					offsetType = 'left';
					_drag.maxDistance = Math.max(_drag.maxDistance - diffX, _drag.maxDistance);
				}
			break;
			case moveDirection.RIGHT:
				if (offset.left + diffX <= emptyOffset.left && offset.left + diffX >= _drag.lastOffset.left)
				{
					offsetPos = '+=' + diffX;
					offsetType = 'left';
					_drag.maxDistance = Math.max(diffX + _drag.maxDistance, _drag.maxDistance);
				}
			break;
		}
		
		$(_drag.elem).css(offsetType, offsetPos + 'px');
		
		_drag.x = e.pageX;
		_drag.y = e.pageY;
	});
}

SlidingPuzzle.prototype.bindMouseUp = function() {
	$(document).on('mouseup', function(e) {
		if (_tileIsMoving)
			return;
			
		var emptyIndex = _emptyTileIndex;
		var time = 0;
		var lastDistance = _drag.maxDistance;
		
		switch(_drag.direction)
		{
			case moveDirection.UP:
				_emptyTileIndex += _columns;
				time = _transitionDuration / (_tilesHeight / ($(_drag.elem).position().top - _backgroundSectionOffsets[emptyIndex].top));
				lastDistance = Math.abs($(_drag.elem).position().top - _drag.lastOffset.top);
				
			break;
			case moveDirection.DOWN:
				_emptyTileIndex -= _columns;
				time = _transitionDuration / (_tilesHeight / (_backgroundSectionOffsets[emptyIndex].top - $(_drag.elem).position().top));
				lastDistance = Math.abs($(_drag.elem).position().top - _drag.lastOffset.top);
			break;
			case moveDirection.RIGHT:
				_emptyTileIndex--;
				time = _transitionDuration / (_tilesWidth / (_backgroundSectionOffsets[emptyIndex].left - $(_drag.elem).position().left));
				lastDistance = Math.abs($(_drag.elem).position().left - _drag.lastOffset.left);
			break;
			case moveDirection.LEFT:
				_emptyTileIndex++;
				time = _transitionDuration / (_tilesWidth / ($(_drag.elem).position().left - _backgroundSectionOffsets[emptyIndex].left));
				lastDistance = Math.abs($(_drag.elem).position().left - _drag.lastOffset.left);
			break;
		}
		
		
		var topDest = _backgroundSectionOffsets[emptyIndex].top;
		var leftDest = _backgroundSectionOffsets[emptyIndex].left;
		if (_drag.maxDistance - lastDistance > _drag.revertOffset)
		{
			topDest = _drag.lastOffset.top;
			leftDest = _drag.lastOffset.left;
			_emptyTileIndex = emptyIndex;
		}

		if (_drag.direction)
		{
			_tileIsMoving = true;
			$(_drag.elem).css({
				transitionProperty: 		'top, left',
				transitionDuration: 		time + 'ms',
				transitionTimingFunction:	'ease',
				top:						topDest,
				left:						leftDest
			});
			
			setTimeout(function() {
				_tileIsMoving = false;
			}, time);
		}
		
		
		_drag.elem = null;
		_drag.direction = moveDirection.NONE;
		_drag.x = 0;
		_drag.y = 0;
		_drag.state = 0;
		_drag.lastOffset = null;
		_drag.maxDistance = 0;
	});
}

SlidingPuzzle.prototype.bindWindowScroll = function() {
	$(window).scroll(function() {
		
		var puzzleTop = $(_wrapperClass).offset().top;
		var windowHeight = window.innerHeight;
		var scrollTop = $(this).scrollTop();
		
		if ((_flipOnVisible && !_introPlayed) && (puzzleTop >= scrollTop && puzzleTop < scrollTop + windowHeight))
		{
			setTimeout(function() {
				_this.flip();
			}, _transitionDuration*2);
			
			_introPlayed = true;
			
			return;
		}
		
		if (_pauseOnBlur && (puzzleTop > scrollTop + windowHeight) || (puzzleTop + _height < scrollTop))
			_this.stopAutoPlay();
		
	});
}

SlidingPuzzle.prototype.bindWindowBlur = function() {
	$(window).blur(function(){
		_this.stopAutoPlay();
	});
}

SlidingPuzzle.prototype.bindWindowResize = function() {
	$(window).resize(function() {
		var newWidth = $(_wrapperClass).width();
		if (newWidth == _width)
			return;
		
		_backgroundSectionOffsets = [];
		_tileOffsets = [];
		_this.stopAutoPlay();
		_width = $(_wrapperClass).width();
		_emptyTileIndex = _defaultEmptyTileIndex;
		
		$(_elementClass).each(function(index) {
		
			if (index == 0)
			{
				_tilesWidth = $(this).outerWidth();
				_tilesHeight = $(this).outerHeight();
			}
			
			_backgroundSectionOffsets.push({
				top:	$(this).position().top,
				left:	$(this).position().left
			});
			
			_tileOffsets.push({
				top:	$(this).position().top,
				left:	$(this).position().left
			});

		});
		
		_height = _tilesHeight * _rows;
		
		// remove empty tile offsets
		_tileOffsets.splice(_emptyTileIndex, 1);
		
		$(_tiles).each(function(index) {
			$(this).css({
				top:				_tileOffsets[index].top,
				left:				_tileOffsets[index].left,
				width:				_tilesWidth,
				height:				_tilesHeight,
			});
		});
		
		$(_backgroundSections).each(function(index) {
			$(this).css({
				backgroundSize:			_width + 'px ' + _height + 'px',
				backgroundPosition:		(-_tileOffsets[index].left) + 'px ' + (-_tileOffsets[index].top) + 'px'
			});
		});
		
	});
}

SlidingPuzzle.prototype.bindConsole = function() {
	$(_playClass).click(function() {
		_this.startAutoPlay();
	});
			
	$(_pauseClass).click(function() {
		_this.stopAutoPlay();
	});
			
	$(_resetClass).click(function() {
		_this.resetGame();
	});
}

SlidingPuzzle.prototype.bindDocumentReady = function() {
	$(document).ready(function() {
		var puzzleTop = $(_wrapperClass).offset().top;
		var windowHeight = window.innerHeight;
		var scrollTop = $(this).scrollTop();
		
		if ($(document).height() <= windowHeight || !_flipOnVisible || (puzzleTop < scrollTop + windowHeight && puzzleTop > scrollTop))
		{
			setTimeout(function() {
				_this.flip();
			}, _transitionDuration*2);
			
			_introPlayed = true;
		}
	});
}

SlidingPuzzle.prototype.createTiles = function() {
	var length = _tilesNumber;
	
	var object = new Array(length);
	for (i=0; i<length; i++)
		object[i] = $('<div class="sliding-puzzle-tile"><div class="sliding-puzzle-flipper"><div class="sliding-puzzle-cover"></div><div class="sliding-puzzle-back"></div></div></div>');
	
	return object;
}

SlidingPuzzle.prototype.setElementsCSS = function() {
	_tiles = $('.sliding-puzzle-tile');
	_coverSections = $('.sliding-puzzle-cover');
	_backgroundSections = $('.sliding-puzzle-back');
	
	_this.setTilesCSS();
	_this.setCoverCSS();
	_this.setBackCSS();
}

SlidingPuzzle.prototype.setTilesCSS = function() {
	
	$(_tiles).each(function(index) {
		
		$(this).css({
			position:			'absolute',
			top:				_tileOffsets[index].top,
			left:				_tileOffsets[index].left,
			width:				_tilesWidth,
			height:				_tilesHeight,
			boxSizing:			'border-box',
			perspective:		'1000px',
		});
	});
	
	$('.sliding-puzzle-flipper').css({
		transition: 		_transitionDuration + 'ms ',
		transformStyle:		'preserve-3d',
		position:			'relative',
		width:				'100%',
		height:				'100%',
	});
}

SlidingPuzzle.prototype.setCoverCSS = function() {
	var image = _coverImage || 'none';
	if (image != 'none')
		image = 'url(' + image + ')';
	
	$(_coverSections).each(function(index) {
		var rotateValue = 'rotateY(0deg)';
		if (index % 2)
			rotateValue = 'rotateX(0deg)';
		
		$(this).css({
			position:			'absolute',
			zIndex:				2,
			top:				'0',
			left:				'0',
			width:				'100%',
			height:				'100%',
			transition:			_transitionDuration + 'ms',
			transformStyle: 	'preserve-3d',
			backfaceVisibility:	'hidden',
			transform:			rotateValue,
			backgroundImage:	image,
			backgroundSize:		_width + 'px ' + _height + 'px',
			backgroundPosition:		(-_tileOffsets[index].left) + 'px ' + (-_tileOffsets[index].top ) + 'px'
		});
	});
}

SlidingPuzzle.prototype.setBackCSS = function() {
	var image = _tilesImage || 'none';
	if (image != 'none')
		image = 'url(' + image + ')';
	
	$(_backgroundSections).each(function(index) {
		var rotateValue = 'rotateY(-180deg)';
		if (index % 2)
			rotateValue = 'rotateX(-180deg)';
		
		$(this).css({
			position:			'absolute',
			zIndex:				1,
			top:				'0',
			left:				'0',
			width:				'100%',
			height:				'100%',
			transition:			_transitionDuration + 'ms',
			transformStyle: 	'preserve-3d',
			backfaceVisibility:	'hidden',
			cursor:				'pointer',
			transform:			rotateValue,
			backgroundImage:	image,
			backgroundSize:		_width + 'px ' + _height + 'px',
			backgroundPosition:		(-_tileOffsets[index].left) + 'px ' + (-_tileOffsets[index].top ) + 'px'
		});
	});
}

SlidingPuzzle.prototype.flip = function() {
	$('.sliding-puzzle-back').each(function(index) {
		$(this).css({transition:		'all ' + _transitionDuration*2 + 'ms ease'});
		
		if (index % 2) 
			$(this).css({transform: 		'rotateX(0deg)'});
		else
			$(this).css({transform: 		'rotateY(0deg)'});
	});
	
	$('.sliding-puzzle-cover').each(function(index) {
		$(this).css({transition:		'all ' + _transitionDuration*2 + 'ms ease'});
		
		if (index % 2) 
			$(this).css({transform: 		'rotateX(180deg)'});
		else
			$(this).css({transform: 		'rotateY(180deg)'});
	});
	
	
	setTimeout(function() {
		$(_coverSections).remove();
		
		$('.sliding-puzzle-tile').eq(_emptyTileIndex).fadeOut(400, function() {
			$(this).remove();
			
			_tiles = $('.sliding-puzzle-tile');
			_backgroundSections = $('.sliding-puzzle-back');
			
			$(_tiles).css({
				transitionProperty: 		'top, left',
				transitionDuration: 		_transitionDuration + 'ms',
				transitionTimingFunction:	'ease'
			});
		
			// remove empty tile offsets
			_tileOffsets.splice(_emptyTileIndex, 1);
			
			_this.startAutoPlay();
			
		});
		
	}, _transitionDuration*2);
}

function isOppositeDirection(direction1, direction2) {
	if (
		(direction1 == moveDirection.UP && direction2 == moveDirection.DOWN) 	||
		(direction1 == moveDirection.DOWN && direction2 == moveDirection.UP) 	||
		(direction1 == moveDirection.LEFT && direction2 == moveDirection.RIGHT) ||
		(direction1 == moveDirection.RIGHT && direction2 == moveDirection.LEFT)
	)
		return true;
	
	return false;
}

SlidingPuzzle.prototype.getRandomPositionInset = function(set) {
	if (_lastMove == moveDirection.NONE)
	{
		var j = Math.floor(Math.random() * set.length);
		_lastMove = set[j].direction;
		return set[j].index;
	}
	
	var oldLength = set.length;
	var i = 0;
	while (i < oldLength)
	{
		if (isOppositeDirection(_lastMove, set[i].direction))
		{
			set.splice(i, 1);
			break;
		}
			
		i++;
	}
		
	var j = Math.floor(Math.random() * set.length);
	_lastMove = set[j].direction;
	
	return set[j].index;
}

SlidingPuzzle.prototype.moveRandomTile = function() {
	var nextIndex = _this.getNextPosition();
	var DOMindex = getIndexByOffset(_backgroundSectionOffsets[nextIndex].top, _backgroundSectionOffsets[nextIndex].left);
	
	_tileIsMoving = true;
	$(_tiles).eq(DOMindex).css({
		top:						_backgroundSectionOffsets[_emptyTileIndex].top,
		left:						_backgroundSectionOffsets[_emptyTileIndex].left
	});
	
	setTimeout(function() {
		_tileIsMoving = false;
	}, _transitionDuration);
	
	
	_emptyTileIndex = nextIndex;
}

SlidingPuzzle.prototype.getNextPosition = function() {
	var indexes = new Array();
	var emptyIndex = _emptyTileIndex;
	var rows = _rows;
	var columns = _columns;
	
	if (emptyIndex < columns) // first row, cant move up
	{
		if (emptyIndex == 0) // first element, can only move right or down
			indexes.push(
				{ index:	emptyIndex+1, direction:	moveDirection.RIGHT },
				{ index:		columns,  direction:	moveDirection.DOWN }
			);
			
		else if (emptyIndex == columns - 1) // last element of the row, can only move left or down
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT 	},
				{ index:	emptyIndex + columns, 	direction:	moveDirection.DOWN }
			);
			
		else // element in the middle, can not only move up
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT  },
				{ index:	emptyIndex + columns, 	direction:	moveDirection.DOWN },
				{ index:	emptyIndex+1, 			direction:	moveDirection.RIGHT }
			);
	}
	else if (emptyIndex >= columns * (rows-1)) // last row, cant move down
	{
		if (emptyIndex == columns * (rows-1)) // first element, can only move right or up
			indexes.push(
				{ index:	emptyIndex+1, 			direction:	moveDirection.RIGHT },
				{ index:	columns, 				direction:	moveDirection.UP 	}
			);
			
		else if (emptyIndex == columns * rows - 1) // last element , can only move left or up
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT 	},
				{ index:	emptyIndex - columns, 	direction:	moveDirection.UP 	}
			);
			
		else // element in the middle, can not only move down
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT  },
				{ index:	emptyIndex - columns, 	direction:	moveDirection.UP 	},
				{ index:	emptyIndex+1, 			direction:	moveDirection.RIGHT }
			);
	}
	else // element in in the middle, can move in any direction
	{
		if (emptyIndex % columns == 0) // first element of the row, cant only move left
			indexes.push(
				{ index:	emptyIndex - columns, 	direction:	moveDirection.UP  	},
				{ index:	emptyIndex + columns, 	direction:	moveDirection.DOWN  },
				{ index:	emptyIndex+1, 			direction:	moveDirection.RIGHT }
			);
		
		else if (emptyIndex % columns == columns - 1) // last element of the row, cant only move right
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT  },
				{ index:	emptyIndex - columns, 	direction:	moveDirection.UP 	},
				{ index:	emptyIndex + columns, 	direction:	moveDirection.DOWN  }
			);
		
		else // can move everywhere
			indexes.push(
				{ index:	emptyIndex-1, 			direction:	moveDirection.LEFT  },
				{ index:	emptyIndex - columns, 	direction:	moveDirection.UP 	},
				{ index:	emptyIndex+1, 			direction:	moveDirection.RIGHT },
				{ index:	emptyIndex + columns, 	direction:	moveDirection.DOWN  }
			);
	}
	
	return _this.getRandomPositionInset(indexes);
}

SlidingPuzzle.prototype.startAutoPlay = function() {
	if (!_state)
	{
		$(_tiles).css({
			transitionProperty: 		'top, left',
			transitionDuration: 		_transitionDuration + 'ms',
			transitionTimingFunction:	'ease'
		});
		this.toggleConsoleButtons();
		this.moveRandomTile();
		_intervalHandler = setInterval(this.moveRandomTile, _playInterval);
		_state = 1;
	}
}

SlidingPuzzle.prototype.stopAutoPlay = function() {
	if (_state)
	{
		_lastMove = moveDirection.NONE;
		this.toggleConsoleButtons();
		clearInterval(_intervalHandler);
		_state = 0;
	}
}

SlidingPuzzle.prototype.resetGame = function() {
	this.stopAutoPlay();
	
	$(_tiles).each(function(index) {
		$(this).css({
			top:				_tileOffsets[index].top,
			left:				_tileOffsets[index].left
		});
	});
	
	_emptyTileIndex = _defaultEmptyTileIndex;
}

function getIndexByOffset(top, left) {
	var value = -1;
	$(_tiles).each(function(index) {
		if (Math.round($(this).position().top) == Math.round(top) && Math.round($(this).position().left) == Math.round(left))
		{
			value = index;
			return false;
		}
	});
	
	return value;
}

SlidingPuzzle.prototype.toggleConsoleButtons = function() {
	if (_state)
	{
		$(_playClass).css(_inactiveProperties);
		$(_pauseClass).css(_activeProperties);
	}
	else
	{
		$(_playClass).css(_activeProperties);
		$(_pauseClass).css(_inactiveProperties);
	}
}
