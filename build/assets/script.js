// Web Audio 101

(function (window, $){


// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var transitionEnd = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';




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
	var drum = this;
	this.path = path;
	this.context = context;
	this.name = /(?:\/707)(\w+)(?:\.)/i.exec( path )[1].toLowerCase();

	(function loadSound() {
		var request = new XMLHttpRequest();
		request.responseType = 'arraybuffer';

		// Decode asynchronously
		request.onload = function handleLoadSound ( event ) {
			if( event.type !== 'load' ) return;
			var xhr = event.target;

			context.decodeAudioData( xhr.response, function(buffer) {
				drum.buffer = buffer;
				drum.bang();
			});

		};

		request.open('GET', path, true);
		request.send();
	})();
}

Drum.prototype = new Evented();
Drum.prototype.constructor = Drum;

Drum.prototype.bang = function bang () {
	var node = this.context.createBufferSource();
	node.buffer = this.buffer;
	node.connect( this.context.destination );
	node.start( 0 );

	this.trigger('bang');
}


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

var drumObjects = {};

for( drum in drums ) { if( drums.hasOwnProperty( drum ) ){
	// loadSound( drums[drum].path );
	drumObjects[ drum ] = new Drum( drums[drum].path, context );
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
var tempo = 107;
var division = 4;	// as in 4 1/16th-notes per beat.
var currentDrum;

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
sequence.push(['ltm']);
sequence.push(['tambo', 'mtm']);
sequence.push(['tambo']);
sequence.push(['tambo', 'clap']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push(['rimsh']);


function playStep ( stepIndex ) {
	var hits = sequence[ stepIndex ];
	var hitCount = hits.length;

	currentStep = ++currentStep % seqMaxLen;

	while( hitCount-- ) {
		// bang( drums[ hits[ hitCount ] ] );
		drumObjects[ hits[ hitCount ] ].bang();
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




// **********************************************
//
// Interface (event handling)
// - this could probably become a kind of master object, or controller
//
// **********************************************

var mousedown = false;
var $pads;	// will be a $set of buttons for use as drum pads

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
	// bang( drums[ event.target.id ] );
	drumObjects[ event.target.id ].bang();

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}



(function padController () {
	var $document = $(document);
	var $padgrid = $('#padgrid');
	$pads = $padgrid.find('button');

	// Each pad 'listens' to its associated drum for 'bang' events
	//  and flashes when it hears one.
	$pads.each( function setDrumEvents ( index, pad ){
		var $pad = $(pad);
		drumObjects[ pad.id ].on( 'bang', function onBang ( /*event*/ ){
console.log('bangbang', pad.id );
			$pad.addClass( 'struck' );
			$pad.one( transitionEnd, function (){ console.log('end'); $pad.removeClass( 'struck' ); });
		});
	});

	// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
	$document.on('mousedown', function toggleMouseDownTrue () { mousedown = true; } );
	$document.on('mouseup', function toggleMouseDownFalse () { mousedown = false; } );

	// delegate drum pad taps to padgrid
	$padgrid.on('touchstart', 'button', handlePadHit );
	$padgrid.on('mousedown', 'button', handlePadHit );
	$padgrid.on('mouseenter', 'button', function ( event ) {
		if( mousedown ) { handlePadHit( event ); }
	});
})();

(function sequencerController () {
	$(document).on('keydown', handleKeys );

})();




}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG5cbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG52YXIgdHJhbnNpdGlvbkVuZCA9ICd3ZWJraXRUcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIG9UcmFuc2l0aW9uRW5kIG1zVHJhbnNpdGlvbkVuZCB0cmFuc2l0aW9uZW5kJztcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykudHJpZ2dlciggZXZlbnROYW1lICk7IHJldHVybiB0aGlzOyB9XG59XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBkcnVtIHNvdW5kcywgY2hhbm5lbCB0byBwbGF5IHRoZW0gdGhyb3VnaCwgbG9hZGVyIHRvIGxvYWQgdGhlbSBldGNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbnZhciBtYXRjaERydW1JRCA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pO1xuXG5mdW5jdGlvbiBsb2FkU291bmQoIHNvdW5kVXJsICkge1xuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gaGFuZGxlTG9hZFNvdW5kICggZXZlbnQgKSB7XG5cdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXHRcdHZhciBpZCA9IG1hdGNoRHJ1bUlELmV4ZWMoIHNvdW5kVXJsIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0ZHJ1bXNbIGlkIF0uYnVmZmVyID0gYnVmZmVyO1xuXHRcdFx0YmFuZyggZHJ1bXNbIGlkIF0gKTtcblx0XHR9KTtcblxuXHRcdG1hdGNoRHJ1bUlELmxhc3RJbmRleCA9IDA7XG5cdH07XG5cblx0cmVxdWVzdC5vcGVuKCdHRVQnLCBzb3VuZFVybCwgdHJ1ZSk7XG5cdHJlcXVlc3Quc2VuZCgpO1xufVxuXG5cbmZ1bmN0aW9uIGJhbmcoIGRydW0gKSB7XG5cdHZhciBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpOyAvLyBjcmVhdGVzIGEgc291bmQgc291cmNlXG5cblx0c291cmNlLmJ1ZmZlciA9IGRydW0uYnVmZmVyOyAgICAgICAgICAgICAgIC8vIHRlbGwgdGhlIHNvdXJjZSB3aGljaCBzb3VuZCB0byBwbGF5XG5cdHNvdXJjZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pOyAgICAgICAvLyBjb25uZWN0IHRoZSBzb3VyY2UgdG8gdGhlIGNvbnRleHQncyBkZXN0aW5hdGlvbiAodGhlIHNwZWFrZXJzKVxuXHRzb3VyY2Uuc3RhcnQoMCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxheSB0aGUgc291cmNlIG5vd1xufVxuXG5cblxuXG4vKipcbiAqIEBjbGFzcyBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dmFyIGRydW0gPSB0aGlzO1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLm5hbWUgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaS5leGVjKCBwYXRoIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHQoZnVuY3Rpb24gbG9hZFNvdW5kKCkge1xuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdFx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdFx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdFx0ZHJ1bS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRcdGRydW0uYmFuZygpO1xuXHRcdFx0fSk7XG5cblx0XHR9O1xuXG5cdFx0cmVxdWVzdC5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblx0XHRyZXF1ZXN0LnNlbmQoKTtcblx0fSkoKTtcbn1cblxuRHJ1bS5wcm90b3R5cGUgPSBuZXcgRXZlbnRlZCgpO1xuRHJ1bS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEcnVtO1xuXG5EcnVtLnByb3RvdHlwZS5iYW5nID0gZnVuY3Rpb24gYmFuZyAoKSB7XG5cdHZhciBub2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXHRub2RlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuXHRub2RlLmNvbm5lY3QoIHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbiApO1xuXHRub2RlLnN0YXJ0KCAwICk7XG5cblx0dGhpcy50cmlnZ2VyKCdiYW5nJyk7XG59XG5cblxuLy8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG52YXIgZHJ1bXMgPSB7XG5cdCdjbGFwJyAgOiB7IGdyaWQ6IDEsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2Nvd2JsJyA6IHsgZ3JpZDogMiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2h0bScgICA6IHsgZ3JpZDogMywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdsdG0nICAgOiB7IGdyaWQ6IDQsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnbXRtJyAgIDogeyBncmlkOiA1LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J3JpbXNoJyA6IHsgZ3JpZDogNiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J3RhbWJvJyA6IHsgZ3JpZDogNywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfVxufTtcblxudmFyIGRydW1PYmplY3RzID0ge307XG5cbmZvciggZHJ1bSBpbiBkcnVtcyApIHsgaWYoIGRydW1zLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0Ly8gbG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG5cdGRydW1PYmplY3RzWyBkcnVtIF0gPSBuZXcgRHJ1bSggZHJ1bXNbZHJ1bV0ucGF0aCwgY29udGV4dCApO1xufX1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc2VxdWVuY2VyJyBzZWN0aW9uXG4vLyBEYXRhIHN0cnVjdHVyZXMgZm9yIHRoZSBzZXF1ZW5jZSwgYSBkZWZhdWx0IHNlcXVlbmNlLCBmdW5jdGlvbnMgZm9yIHBsYXliYWNrXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG52YXIgc2VxdWVuY2UgPSBbXTtcbnZhciBzZXFNYXhMZW4gPSAxNjtcbnZhciBjdXJyZW50U3RlcCA9IDA7XG52YXIgbmV4dFRpbWVyOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cbnZhciBwbGF5aW5nID0gZmFsc2U7XG52YXIgdGVtcG8gPSAxMDc7XG52YXIgZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG52YXIgY3VycmVudERydW07XG5cbi8vIGEgZGVmYXVsdCBzZXF1ZW5jZVxuLy9cbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goWydsdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuXG5mdW5jdGlvbiBwbGF5U3RlcCAoIHN0ZXBJbmRleCApIHtcblx0dmFyIGhpdHMgPSBzZXF1ZW5jZVsgc3RlcEluZGV4IF07XG5cdHZhciBoaXRDb3VudCA9IGhpdHMubGVuZ3RoO1xuXG5cdGN1cnJlbnRTdGVwID0gKytjdXJyZW50U3RlcCAlIHNlcU1heExlbjtcblxuXHR3aGlsZSggaGl0Q291bnQtLSApIHtcblx0XHQvLyBiYW5nKCBkcnVtc1sgaGl0c1sgaGl0Q291bnQgXSBdICk7XG5cdFx0ZHJ1bU9iamVjdHNbIGhpdHNbIGhpdENvdW50IF0gXS5iYW5nKCk7XG5cdH1cblxuXHRpZiggcGxheWluZyApIHtcblx0XHRuZXh0VGltZXIgPSBzZXRUaW1lb3V0KCBwbGF5U3RlcCwgaW50ZXJ2YWwsIGN1cnJlbnRTdGVwICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdG9nZ2xlU3RhcnRTdG9wICgpIHtcblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0cGxheWluZyA9IGZhbHNlO1xuXHRcdGNsZWFyVGltZW91dCggbmV4dFRpbWVyICk7XG5cdH0gZWxzZSB7XG5cdFx0cGxheWluZyA9IHRydWU7XG5cdFx0c3RhcnRTZXF1ZW5jZSgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0U2VxdWVuY2UgKCkge1xuXHRpbnRlcnZhbCA9ICg2MCAvICh0ZW1wbyAqIGRpdmlzaW9uKSkgKiAxMDAwO1xuXHRwbGF5U3RlcCggY3VycmVudFN0ZXAgKTtcbn1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG52YXIgJHBhZHM7XHQvLyB3aWxsIGJlIGEgJHNldCBvZiBidXR0b25zIGZvciB1c2UgYXMgZHJ1bSBwYWRzXG5cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcblx0c3dpdGNoKCBldmVudC53aGljaCApIHtcblx0Y2FzZSAzMjpcblx0XHR0b2dnbGVTdGFydFN0b3AoKTtcblx0XHRicmVhaztcbiBcdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHQvLyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0Ly8gYmFuZyggZHJ1bXNbIGV2ZW50LnRhcmdldC5pZCBdICk7XG5cdGRydW1PYmplY3RzWyBldmVudC50YXJnZXQuaWQgXS5iYW5nKCk7XG5cblx0Ly8gYmx1ciBpZiBjbGlja2VkIChidXQgZG9lc24ndCBhY3R1YWxseSB3b3JrKVxuXHRpZiggL21vdXNlLy50ZXN0KCBldmVudC50eXBlICkgKSBldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cblxuKGZ1bmN0aW9uIHBhZENvbnRyb2xsZXIgKCkge1xuXHR2YXIgJGRvY3VtZW50ID0gJChkb2N1bWVudCk7XG5cdHZhciAkcGFkZ3JpZCA9ICQoJyNwYWRncmlkJyk7XG5cdCRwYWRzID0gJHBhZGdyaWQuZmluZCgnYnV0dG9uJyk7XG5cblx0Ly8gRWFjaCBwYWQgJ2xpc3RlbnMnIHRvIGl0cyBhc3NvY2lhdGVkIGRydW0gZm9yICdiYW5nJyBldmVudHNcblx0Ly8gIGFuZCBmbGFzaGVzIHdoZW4gaXQgaGVhcnMgb25lLlxuXHQkcGFkcy5lYWNoKCBmdW5jdGlvbiBzZXREcnVtRXZlbnRzICggaW5kZXgsIHBhZCApe1xuXHRcdHZhciAkcGFkID0gJChwYWQpO1xuXHRcdGRydW1PYmplY3RzWyBwYWQuaWQgXS5vbiggJ2JhbmcnLCBmdW5jdGlvbiBvbkJhbmcgKCAvKmV2ZW50Ki8gKXtcbmNvbnNvbGUubG9nKCdiYW5nYmFuZycsIHBhZC5pZCApO1xuXHRcdFx0JHBhZC5hZGRDbGFzcyggJ3N0cnVjaycgKTtcblx0XHRcdCRwYWQub25lKCB0cmFuc2l0aW9uRW5kLCBmdW5jdGlvbiAoKXsgY29uc29sZS5sb2coJ2VuZCcpOyAkcGFkLnJlbW92ZUNsYXNzKCAnc3RydWNrJyApOyB9KTtcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG5cdCRkb2N1bWVudC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH0gKTtcblx0JGRvY3VtZW50Lm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duRmFsc2UgKCkgeyBtb3VzZWRvd24gPSBmYWxzZTsgfSApO1xuXG5cdC8vIGRlbGVnYXRlIGRydW0gcGFkIHRhcHMgdG8gcGFkZ3JpZFxuXHQkcGFkZ3JpZC5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcblx0JHBhZGdyaWQub24oJ21vdXNlZG93bicsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcblx0JHBhZGdyaWQub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRpZiggbW91c2Vkb3duICkgeyBoYW5kbGVQYWRIaXQoIGV2ZW50ICk7IH1cblx0fSk7XG59KSgpO1xuXG4oZnVuY3Rpb24gc2VxdWVuY2VyQ29udHJvbGxlciAoKSB7XG5cdCQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgaGFuZGxlS2V5cyApO1xuXG59KSgpO1xuXG5cblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=