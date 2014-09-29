// Web Audio 101

(function (window, $){


// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;





// **********************************************
//
// Helper objects
//
// **********************************************

/**
 * Evented
 * adds event handling to objects, delegating to $
 */
function Evented () {}
Evented.prototype = {
	constructor: Evented,
	on: function ( eventName, callback ) { $(this).on( eventName, callback ); return this; },
	off: function ( eventName, callback ) { $(this).off( eventName, callback ); return this; },
	trigger: function ( eventName, callback ) { $(this).trigger( eventName ); return this; }
}




// **********************************************
//
// The 'synth' section
// drum sounds, channel to play them through, loader to load them etc
//
// **********************************************


var context = new AudioContext();

var matchDrumID = /(?:\/707)(\w+)(?:\.)/i;

function loadSound( soundUrl ) {
	var request = new XMLHttpRequest();
	request.responseType = 'arraybuffer';

	// Decode asynchronously
	request.onload = function handleLoadSound ( event ) {
		if( event.type !== 'load' ) return;
		var xhr = event.target;
		var id = matchDrumID.exec( soundUrl )[1].toLowerCase();

		context.decodeAudioData( xhr.response, function(buffer) {
			drums[ id ].buffer = buffer;
			bang( drums[ id ] );
		});

		matchDrumID.lastIndex = 0;
	};

	request.open('GET', soundUrl, true);
	request.send();
}


function bang( drum ) {
	var source = context.createBufferSource(); // creates a sound source

	source.buffer = drum.buffer;               // tell the source which sound to play
	source.connect(context.destination);       // connect the source to the context's destination (the speakers)
	source.start(0);                           // play the source now
}




/**
 * @class Drum
 * @extends Evented
 * handles loading & decoding samples, and attaching to the audio graph
 */
function Drum ( path, context ) {
	this.path = path;
	this.context = context;
}
Drum.prototype = new Evented();
Drum.prototype.constructor = Drum;
Drum.prototype.bang = function bang () {
	var node = this.context.createBufferSource();
	node.buffer = this.buffer;
	node.connect( this.context.destination );
	node.start( 0 );
}

var snare = new Drum( 'assets/707/707CLAP.WAV', context )
console.log( snare );


// list sounds, then load and play them
var drums = {
	'clap'  : { grid: 1, path: 'assets/707/707CLAP.WAV', buffer: undefined },
	'cowbl' : { grid: 2, path: 'assets/707/707COWBL.WAV', buffer: undefined },
	'htm'   : { grid: 3, path: 'assets/707/707HTM.WAV', buffer: undefined },
	'ltm'   : { grid: 4, path: 'assets/707/707LTM.WAV', buffer: undefined },
	'mtm'   : { grid: 5, path: 'assets/707/707MTM.WAV', buffer: undefined },
	'rimsh' : { grid: 6, path: 'assets/707/707RIMSH.WAV', buffer: undefined },
	'tambo' : { grid: 7, path: 'assets/707/707TAMBO.WAV', buffer: undefined }
};

for( drum in drums ) { if( drums.hasOwnProperty( drum ) ){
	loadSound( drums[drum].path );
}}




// **********************************************
//
// The 'sequencer' section
// Data structures for the sequence, a default sequence, functions for playback
//
// **********************************************

var sequence = [];
var seqMaxLen = 16;
var currentStep = 0;
var nextTimer; 	// will hold the timeout id for the next step, so the sequencer can be stopped.
var playing = false;
var tempo = 100;
var division = 4;	// as in 4 1/16th-notes per beat.


// a default sequence
//
sequence.push(['tambo', 'mtm', 'cowbl']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push([]);
sequence.push(['tambo', 'clap']);
sequence.push([]);
sequence.push(['tambo', 'mtm']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push([]);
sequence.push(['tambo', 'mtm']);
sequence.push([]);
sequence.push(['tambo', 'clap']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push(['rimsh']);


function playStep ( stepIndex ) {
	var hits = sequence[ stepIndex ];
	var hitCount = hits.length;

	currentStep = ++currentStep % seqMaxLen;

	while( hitCount-- ) {
		bang( drums[ hits[ hitCount ] ] );
	}

	if( playing ) {
		nextTimer = setTimeout( playStep, interval, currentStep );
	}
}

function toggleStartStop () {
	if( playing ) {
		playing = false;
		clearTimeout( nextTimer );
	} else {
		playing = true;
		startSequence();
	}
}

function startSequence () {
	interval = (60 / (tempo * division)) * 1000;
	playStep( currentStep );
}


//
// Interface (event handling)
// - this could probably become a kind of master object, or controller
//

var mousedown = false;

function handleKeys ( event ) {
	switch( event.which ) {
	case 32:
		toggleStartStop();
		break;
 	}
}

function handlePadHit ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();
	// event.stopPropagation();
	bang( drums[ event.target.id ] );

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
$(document).on('mousedown', function toggleMouseDownTrue () { mousedown = true; } );
$(document).on('mouseup', function toggleMouseDownFalse () { mousedown = false; } );

// delegate drum pad taps to padgrid
$(document).on('keydown', handleKeys );
$('#padgrid').on('touchstart', 'button', handlePadHit );
$('#padgrid').on('mousedown', 'button', handlePadHit );
$('#padgrid').on('mouseenter', 'button', function ( event ) {
	if( mousedown ) { handlePadHit( event ); }
});


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdlYiBBdWRpbyAxMDFcblxuKGZ1bmN0aW9uICh3aW5kb3csICQpe1xuXG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykudHJpZ2dlciggZXZlbnROYW1lICk7IHJldHVybiB0aGlzOyB9XG59XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBkcnVtIHNvdW5kcywgY2hhbm5lbCB0byBwbGF5IHRoZW0gdGhyb3VnaCwgbG9hZGVyIHRvIGxvYWQgdGhlbSBldGNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbnZhciBtYXRjaERydW1JRCA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pO1xuXG5mdW5jdGlvbiBsb2FkU291bmQoIHNvdW5kVXJsICkge1xuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gaGFuZGxlTG9hZFNvdW5kICggZXZlbnQgKSB7XG5cdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXHRcdHZhciBpZCA9IG1hdGNoRHJ1bUlELmV4ZWMoIHNvdW5kVXJsIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0ZHJ1bXNbIGlkIF0uYnVmZmVyID0gYnVmZmVyO1xuXHRcdFx0YmFuZyggZHJ1bXNbIGlkIF0gKTtcblx0XHR9KTtcblxuXHRcdG1hdGNoRHJ1bUlELmxhc3RJbmRleCA9IDA7XG5cdH07XG5cblx0cmVxdWVzdC5vcGVuKCdHRVQnLCBzb3VuZFVybCwgdHJ1ZSk7XG5cdHJlcXVlc3Quc2VuZCgpO1xufVxuXG5cbmZ1bmN0aW9uIGJhbmcoIGRydW0gKSB7XG5cdHZhciBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpOyAvLyBjcmVhdGVzIGEgc291bmQgc291cmNlXG5cblx0c291cmNlLmJ1ZmZlciA9IGRydW0uYnVmZmVyOyAgICAgICAgICAgICAgIC8vIHRlbGwgdGhlIHNvdXJjZSB3aGljaCBzb3VuZCB0byBwbGF5XG5cdHNvdXJjZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pOyAgICAgICAvLyBjb25uZWN0IHRoZSBzb3VyY2UgdG8gdGhlIGNvbnRleHQncyBkZXN0aW5hdGlvbiAodGhlIHNwZWFrZXJzKVxuXHRzb3VyY2Uuc3RhcnQoMCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxheSB0aGUgc291cmNlIG5vd1xufVxuXG5cblxuXG4vKipcbiAqIEBjbGFzcyBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dGhpcy5wYXRoID0gcGF0aDtcblx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcbn1cbkRydW0ucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcbkRydW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHJ1bTtcbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcbn1cblxudmFyIHNuYXJlID0gbmV3IERydW0oICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJywgY29udGV4dCApXG5jb25zb2xlLmxvZyggc25hcmUgKTtcblxuXG4vLyBsaXN0IHNvdW5kcywgdGhlbiBsb2FkIGFuZCBwbGF5IHRoZW1cbnZhciBkcnVtcyA9IHtcblx0J2NsYXAnICA6IHsgZ3JpZDogMSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnY293YmwnIDogeyBncmlkOiAyLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDT1dCTC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnaHRtJyAgIDogeyBncmlkOiAzLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdIVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2x0bScgICA6IHsgZ3JpZDogNCwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdtdG0nICAgOiB7IGdyaWQ6IDUsIHBhdGg6ICdhc3NldHMvNzA3LzcwN01UTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQncmltc2gnIDogeyBncmlkOiA2LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdSSU1TSC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQndGFtYm8nIDogeyBncmlkOiA3LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdUQU1CTy5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9XG59O1xuXG5mb3IoIGRydW0gaW4gZHJ1bXMgKSB7IGlmKCBkcnVtcy5oYXNPd25Qcm9wZXJ0eSggZHJ1bSApICl7XG5cdGxvYWRTb3VuZCggZHJ1bXNbZHJ1bV0ucGF0aCApO1xufX1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc2VxdWVuY2VyJyBzZWN0aW9uXG4vLyBEYXRhIHN0cnVjdHVyZXMgZm9yIHRoZSBzZXF1ZW5jZSwgYSBkZWZhdWx0IHNlcXVlbmNlLCBmdW5jdGlvbnMgZm9yIHBsYXliYWNrXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG52YXIgc2VxdWVuY2UgPSBbXTtcbnZhciBzZXFNYXhMZW4gPSAxNjtcbnZhciBjdXJyZW50U3RlcCA9IDA7XG52YXIgbmV4dFRpbWVyOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cbnZhciBwbGF5aW5nID0gZmFsc2U7XG52YXIgdGVtcG8gPSAxMDA7XG52YXIgZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblxuLy8gYSBkZWZhdWx0IHNlcXVlbmNlXG4vL1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5cbmZ1bmN0aW9uIHBsYXlTdGVwICggc3RlcEluZGV4ICkge1xuXHR2YXIgaGl0cyA9IHNlcXVlbmNlWyBzdGVwSW5kZXggXTtcblx0dmFyIGhpdENvdW50ID0gaGl0cy5sZW5ndGg7XG5cblx0Y3VycmVudFN0ZXAgPSArK2N1cnJlbnRTdGVwICUgc2VxTWF4TGVuO1xuXG5cdHdoaWxlKCBoaXRDb3VudC0tICkge1xuXHRcdGJhbmcoIGRydW1zWyBoaXRzWyBoaXRDb3VudCBdIF0gKTtcblx0fVxuXG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdG5leHRUaW1lciA9IHNldFRpbWVvdXQoIHBsYXlTdGVwLCBpbnRlcnZhbCwgY3VycmVudFN0ZXAgKTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b2dnbGVTdGFydFN0b3AgKCkge1xuXHRpZiggcGxheWluZyApIHtcblx0XHRwbGF5aW5nID0gZmFsc2U7XG5cdFx0Y2xlYXJUaW1lb3V0KCBuZXh0VGltZXIgKTtcblx0fSBlbHNlIHtcblx0XHRwbGF5aW5nID0gdHJ1ZTtcblx0XHRzdGFydFNlcXVlbmNlKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RhcnRTZXF1ZW5jZSAoKSB7XG5cdGludGVydmFsID0gKDYwIC8gKHRlbXBvICogZGl2aXNpb24pKSAqIDEwMDA7XG5cdHBsYXlTdGVwKCBjdXJyZW50U3RlcCApO1xufVxuXG5cbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0dG9nZ2xlU3RhcnRTdG9wKCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVBhZEhpdCAoIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0Ly8gZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGJhbmcoIGRydW1zWyBldmVudC50YXJnZXQuaWQgXSApO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxuLy8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG4kKGRvY3VtZW50KS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH0gKTtcbiQoZG9jdW1lbnQpLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duRmFsc2UgKCkgeyBtb3VzZWRvd24gPSBmYWxzZTsgfSApO1xuXG4vLyBkZWxlZ2F0ZSBkcnVtIHBhZCB0YXBzIHRvIHBhZGdyaWRcbiQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgaGFuZGxlS2V5cyApO1xuJCgnI3BhZGdyaWQnKS5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZG93bicsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG59KTtcblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=