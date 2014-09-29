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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdlYiBBdWRpbyAxMDFcblxuKGZ1bmN0aW9uICh3aW5kb3csICQpe1xuXG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbnZhciB0cmFuc2l0aW9uRW5kID0gJ3dlYmtpdFRyYW5zaXRpb25FbmQgb3RyYW5zaXRpb25lbmQgb1RyYW5zaXRpb25FbmQgbXNUcmFuc2l0aW9uRW5kIHRyYW5zaXRpb25lbmQnO1xuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSGVscGVyIG9iamVjdHNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qKlxuICogRXZlbnRlZFxuICogYWRkcyBldmVudCBoYW5kbGluZyB0byBvYmplY3RzLCBkZWxlZ2F0aW5nIHRvICRcbiAqL1xuZnVuY3Rpb24gRXZlbnRlZCAoKSB7fVxuRXZlbnRlZC5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBFdmVudGVkLFxuXHRvbjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9uKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHRvZmY6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vZmYoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdHRyaWdnZXI6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUgKTsgcmV0dXJuIHRoaXM7IH1cbn1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc3ludGgnIHNlY3Rpb25cbi8vIGRydW0gc291bmRzLCBjaGFubmVsIHRvIHBsYXkgdGhlbSB0aHJvdWdoLCBsb2FkZXIgdG8gbG9hZCB0aGVtIGV0Y1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxudmFyIG1hdGNoRHJ1bUlEID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2k7XG5cbmZ1bmN0aW9uIGxvYWRTb3VuZCggc291bmRVcmwgKSB7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIGlkID0gbWF0Y2hEcnVtSUQuZXhlYyggc291bmRVcmwgKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRkcnVtc1sgaWQgXS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRiYW5nKCBkcnVtc1sgaWQgXSApO1xuXHRcdH0pO1xuXG5cdFx0bWF0Y2hEcnVtSUQubGFzdEluZGV4ID0gMDtcblx0fTtcblxuXHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNvdW5kVXJsLCB0cnVlKTtcblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cblxuZnVuY3Rpb24gYmFuZyggZHJ1bSApIHtcblx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7IC8vIGNyZWF0ZXMgYSBzb3VuZCBzb3VyY2VcblxuXHRzb3VyY2UuYnVmZmVyID0gZHJ1bS5idWZmZXI7ICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG59XG5cblxuXG5cbi8qKlxuICogQGNsYXNzIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR2YXIgZHJ1bSA9IHRoaXM7XG5cdHRoaXMucGF0aCA9IHBhdGg7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdHRoaXMubmFtZSA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pLmV4ZWMoIHBhdGggKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdChmdW5jdGlvbiBsb2FkU291bmQoKSB7XG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0XHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRkcnVtLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdFx0ZHJ1bS5iYW5nKCk7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn1cblxuXG4vLyBsaXN0IHNvdW5kcywgdGhlbiBsb2FkIGFuZCBwbGF5IHRoZW1cbnZhciBkcnVtcyA9IHtcblx0J2NsYXAnICA6IHsgZ3JpZDogMSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnY293YmwnIDogeyBncmlkOiAyLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDT1dCTC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnaHRtJyAgIDogeyBncmlkOiAzLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdIVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2x0bScgICA6IHsgZ3JpZDogNCwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdtdG0nICAgOiB7IGdyaWQ6IDUsIHBhdGg6ICdhc3NldHMvNzA3LzcwN01UTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQncmltc2gnIDogeyBncmlkOiA2LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdSSU1TSC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQndGFtYm8nIDogeyBncmlkOiA3LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdUQU1CTy5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9XG59O1xuXG52YXIgZHJ1bU9iamVjdHMgPSB7fTtcblxuZm9yKCBkcnVtIGluIGRydW1zICkgeyBpZiggZHJ1bXMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHQvLyBsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcblx0ZHJ1bU9iamVjdHNbIGRydW0gXSA9IG5ldyBEcnVtKCBkcnVtc1tkcnVtXS5wYXRoLCBjb250ZXh0ICk7XG59fVxuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzZXF1ZW5jZXInIHNlY3Rpb25cbi8vIERhdGEgc3RydWN0dXJlcyBmb3IgdGhlIHNlcXVlbmNlLCBhIGRlZmF1bHQgc2VxdWVuY2UsIGZ1bmN0aW9ucyBmb3IgcGxheWJhY2tcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbnZhciBzZXF1ZW5jZSA9IFtdO1xudmFyIHNlcU1heExlbiA9IDE2O1xudmFyIGN1cnJlbnRTdGVwID0gMDtcbnZhciBuZXh0VGltZXI7IFx0Ly8gd2lsbCBob2xkIHRoZSB0aW1lb3V0IGlkIGZvciB0aGUgbmV4dCBzdGVwLCBzbyB0aGUgc2VxdWVuY2VyIGNhbiBiZSBzdG9wcGVkLlxudmFyIHBsYXlpbmcgPSBmYWxzZTtcbnZhciB0ZW1wbyA9IDEwNztcbnZhciBkaXZpc2lvbiA9IDQ7XHQvLyBhcyBpbiA0IDEvMTZ0aC1ub3RlcyBwZXIgYmVhdC5cbnZhciBjdXJyZW50RHJ1bTtcblxuLy8gYSBkZWZhdWx0IHNlcXVlbmNlXG4vL1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ2x0bSddKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5cbmZ1bmN0aW9uIHBsYXlTdGVwICggc3RlcEluZGV4ICkge1xuXHR2YXIgaGl0cyA9IHNlcXVlbmNlWyBzdGVwSW5kZXggXTtcblx0dmFyIGhpdENvdW50ID0gaGl0cy5sZW5ndGg7XG5cblx0Y3VycmVudFN0ZXAgPSArK2N1cnJlbnRTdGVwICUgc2VxTWF4TGVuO1xuXG5cdHdoaWxlKCBoaXRDb3VudC0tICkge1xuXHRcdC8vIGJhbmcoIGRydW1zWyBoaXRzWyBoaXRDb3VudCBdIF0gKTtcblx0XHRkcnVtT2JqZWN0c1sgaGl0c1sgaGl0Q291bnQgXSBdLmJhbmcoKTtcblx0fVxuXG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdG5leHRUaW1lciA9IHNldFRpbWVvdXQoIHBsYXlTdGVwLCBpbnRlcnZhbCwgY3VycmVudFN0ZXAgKTtcblx0fVxufVxuXG5cbmZ1bmN0aW9uIHRvZ2dsZVN0YXJ0U3RvcCAoKSB7XG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdHBsYXlpbmcgPSBmYWxzZTtcblx0XHRjbGVhclRpbWVvdXQoIG5leHRUaW1lciApO1xuXHR9IGVsc2Uge1xuXHRcdHBsYXlpbmcgPSB0cnVlO1xuXHRcdHN0YXJ0U2VxdWVuY2UoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydFNlcXVlbmNlICgpIHtcblx0aW50ZXJ2YWwgPSAoNjAgLyAodGVtcG8gKiBkaXZpc2lvbikpICogMTAwMDtcblx0cGxheVN0ZXAoIGN1cnJlbnRTdGVwICk7XG59XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xudmFyICRwYWRzO1x0Ly8gd2lsbCBiZSBhICRzZXQgb2YgYnV0dG9ucyBmb3IgdXNlIGFzIGRydW0gcGFkc1xuXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0dG9nZ2xlU3RhcnRTdG9wKCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVBhZEhpdCAoIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0Ly8gZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdC8vIGJhbmcoIGRydW1zWyBldmVudC50YXJnZXQuaWQgXSApO1xuXHRkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF0uYmFuZygpO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxuXG5cbihmdW5jdGlvbiBwYWRDb250cm9sbGVyICgpIHtcblx0dmFyICRkb2N1bWVudCA9ICQoZG9jdW1lbnQpO1xuXHR2YXIgJHBhZGdyaWQgPSAkKCcjcGFkZ3JpZCcpO1xuXHQkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xuXG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5jb25zb2xlLmxvZygnYmFuZ2JhbmcnLCBwYWQuaWQgKTtcblx0XHRcdCRwYWQuYWRkQ2xhc3MoICdzdHJ1Y2snICk7XG5cdFx0XHQkcGFkLm9uZSggdHJhbnNpdGlvbkVuZCwgZnVuY3Rpb24gKCl7IGNvbnNvbGUubG9nKCdlbmQnKTsgJHBhZC5yZW1vdmVDbGFzcyggJ3N0cnVjaycgKTsgfSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuXHQkZG9jdW1lbnQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG5cdCRkb2N1bWVudC5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuXHQvLyBkZWxlZ2F0ZSBkcnVtIHBhZCB0YXBzIHRvIHBhZGdyaWRcblx0JHBhZGdyaWQub24oJ3RvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG5cdCRwYWRncmlkLm9uKCdtb3VzZWRvd24nLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG5cdCRwYWRncmlkLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG5cdH0pO1xufSkoKTtcblxuKGZ1bmN0aW9uIHNlcXVlbmNlckNvbnRyb2xsZXIgKCkge1xuXHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcblxufSkoKTtcblxuXG5cblxufSh3aW5kb3csICQpKTtcbi8vIGVuZCBhbnRpLWdsb2JhbCBJSUZFIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9