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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSGVscGVyIG9iamVjdHNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qKlxuICogRXZlbnRlZFxuICogYWRkcyBldmVudCBoYW5kbGluZyB0byBvYmplY3RzLCBkZWxlZ2F0aW5nIHRvICRcbiAqL1xuZnVuY3Rpb24gRXZlbnRlZCAoKSB7fVxuRXZlbnRlZC5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBFdmVudGVkLFxuXHRvbjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9uKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHRvZmY6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vZmYoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdHRyaWdnZXI6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUgKTsgcmV0dXJuIHRoaXM7IH1cbn1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc3ludGgnIHNlY3Rpb25cbi8vIGRydW0gc291bmRzLCBjaGFubmVsIHRvIHBsYXkgdGhlbSB0aHJvdWdoLCBsb2FkZXIgdG8gbG9hZCB0aGVtIGV0Y1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxudmFyIG1hdGNoRHJ1bUlEID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2k7XG5cbmZ1bmN0aW9uIGxvYWRTb3VuZCggc291bmRVcmwgKSB7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIGlkID0gbWF0Y2hEcnVtSUQuZXhlYyggc291bmRVcmwgKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRkcnVtc1sgaWQgXS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRiYW5nKCBkcnVtc1sgaWQgXSApO1xuXHRcdH0pO1xuXG5cdFx0bWF0Y2hEcnVtSUQubGFzdEluZGV4ID0gMDtcblx0fTtcblxuXHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNvdW5kVXJsLCB0cnVlKTtcblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cblxuZnVuY3Rpb24gYmFuZyggZHJ1bSApIHtcblx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7IC8vIGNyZWF0ZXMgYSBzb3VuZCBzb3VyY2VcblxuXHRzb3VyY2UuYnVmZmVyID0gZHJ1bS5idWZmZXI7ICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG59XG5cblxuXG5cbi8qKlxuICogQGNsYXNzIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xufVxuRHJ1bS5wcm90b3R5cGUgPSBuZXcgRXZlbnRlZCgpO1xuRHJ1bS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEcnVtO1xuRHJ1bS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uIGJhbmcgKCkge1xuXHR2YXIgbm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0bm9kZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblx0bm9kZS5jb25uZWN0KCB0aGlzLmNvbnRleHQuZGVzdGluYXRpb24gKTtcblx0bm9kZS5zdGFydCggMCApO1xufVxuXG52YXIgc25hcmUgPSBuZXcgRHJ1bSggJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLCBjb250ZXh0IClcbmNvbnNvbGUubG9nKCBzbmFyZSApO1xuXG5cbi8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxudmFyIGRydW1zID0ge1xuXHQnY2xhcCcgIDogeyBncmlkOiAxLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdjb3dibCcgOiB7IGdyaWQ6IDIsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdodG0nICAgOiB7IGdyaWQ6IDMsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnbHRtJyAgIDogeyBncmlkOiA0LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J210bScgICA6IHsgZ3JpZDogNSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdyaW1zaCcgOiB7IGdyaWQ6IDYsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCd0YW1ibycgOiB7IGdyaWQ6IDcsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH1cbn07XG5cbmZvciggZHJ1bSBpbiBkcnVtcyApIHsgaWYoIGRydW1zLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0bG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG59fVxuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzZXF1ZW5jZXInIHNlY3Rpb25cbi8vIERhdGEgc3RydWN0dXJlcyBmb3IgdGhlIHNlcXVlbmNlLCBhIGRlZmF1bHQgc2VxdWVuY2UsIGZ1bmN0aW9ucyBmb3IgcGxheWJhY2tcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbnZhciBzZXF1ZW5jZSA9IFtdO1xudmFyIHNlcU1heExlbiA9IDE2O1xudmFyIGN1cnJlbnRTdGVwID0gMDtcbnZhciBuZXh0VGltZXI7IFx0Ly8gd2lsbCBob2xkIHRoZSB0aW1lb3V0IGlkIGZvciB0aGUgbmV4dCBzdGVwLCBzbyB0aGUgc2VxdWVuY2VyIGNhbiBiZSBzdG9wcGVkLlxudmFyIHBsYXlpbmcgPSBmYWxzZTtcbnZhciB0ZW1wbyA9IDEwMDtcbnZhciBkaXZpc2lvbiA9IDQ7XHQvLyBhcyBpbiA0IDEvMTZ0aC1ub3RlcyBwZXIgYmVhdC5cblxuXG4vLyBhIGRlZmF1bHQgc2VxdWVuY2Vcbi8vXG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJywgJ2Nvd2JsJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFsncmltc2gnXSk7XG5cblxuZnVuY3Rpb24gcGxheVN0ZXAgKCBzdGVwSW5kZXggKSB7XG5cdHZhciBoaXRzID0gc2VxdWVuY2VbIHN0ZXBJbmRleCBdO1xuXHR2YXIgaGl0Q291bnQgPSBoaXRzLmxlbmd0aDtcblxuXHRjdXJyZW50U3RlcCA9ICsrY3VycmVudFN0ZXAgJSBzZXFNYXhMZW47XG5cblx0d2hpbGUoIGhpdENvdW50LS0gKSB7XG5cdFx0YmFuZyggZHJ1bXNbIGhpdHNbIGhpdENvdW50IF0gXSApO1xuXHR9XG5cblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0bmV4dFRpbWVyID0gc2V0VGltZW91dCggcGxheVN0ZXAsIGludGVydmFsLCBjdXJyZW50U3RlcCApO1xuXHR9XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlU3RhcnRTdG9wICgpIHtcblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0cGxheWluZyA9IGZhbHNlO1xuXHRcdGNsZWFyVGltZW91dCggbmV4dFRpbWVyICk7XG5cdH0gZWxzZSB7XG5cdFx0cGxheWluZyA9IHRydWU7XG5cdFx0c3RhcnRTZXF1ZW5jZSgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0U2VxdWVuY2UgKCkge1xuXHRpbnRlcnZhbCA9ICg2MCAvICh0ZW1wbyAqIGRpdmlzaW9uKSkgKiAxMDAwO1xuXHRwbGF5U3RlcCggY3VycmVudFN0ZXAgKTtcbn1cblxuXG4vL1xuLy8gSW50ZXJmYWNlIChldmVudCBoYW5kbGluZylcbi8vIC0gdGhpcyBjb3VsZCBwcm9iYWJseSBiZWNvbWUgYSBraW5kIG9mIG1hc3RlciBvYmplY3QsIG9yIGNvbnRyb2xsZXJcbi8vXG5cbnZhciBtb3VzZWRvd24gPSBmYWxzZTtcblxuZnVuY3Rpb24gaGFuZGxlS2V5cyAoIGV2ZW50ICkge1xuXHRzd2l0Y2goIGV2ZW50LndoaWNoICkge1xuXHRjYXNlIDMyOlxuXHRcdHRvZ2dsZVN0YXJ0U3RvcCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdC8vIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRiYW5nKCBkcnVtc1sgZXZlbnQudGFyZ2V0LmlkIF0gKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbi8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuJChkb2N1bWVudCkub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG4kKGRvY3VtZW50KS5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuLy8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG4kKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcbiQoJyNwYWRncmlkJykub24oJ3RvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWRvd24nLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxufSk7XG5cblxufSh3aW5kb3csICQpKTtcbi8vIGVuZCBhbnRpLWdsb2JhbCBJSUZFIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9