# Sliding Puzzle
Sliding Puzzle is a funny jQuery plugin that lets you cover a grid in your layout with a sliding puzzle that uncovers you grid elements randomly or lets the user slide the tiles manually.

# Usage
Load the plugin on your page:
```
<script src="./sliding-puzzle.js"></script>
```

Add configuration:
```
$( document ).ready(function() {
	var options = {
		rows:				3	,						// number of rows													 default: 3		 min: 2
		columns:			3	,						// number of columns												 default: 3		 min: 2
		emptyTileIndex:		2	,						// index of the empty tile, 0 = first tile, 1 = second tile, etc	 default: 0		 min: 0		max: rows*columns
		playInterval:		2000,						// interval between tiles move, must be higher than animDuration	 default: 1000	 min: 1000
		animDuration:		1000,						// duration of move animation, must be lower than playInterval		 default: 500	 min: 500
		coverBackgroundURL:	'./front-image.png',		// url to the background image for the cover
		tilesBackgroundURL:	'./back-image.png',			// url to the background image for the tiles
		flipOnVisible:		true,						// flip the tiles only when the game container is visible			 default: false
		pauseOnBlur:		true,						// pause auto-play if the page loses focus or the user scrolls out	 default: true
	}
					
	var puzzle = new SlidingPuzzle(options);
});
```
