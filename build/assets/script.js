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
};




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
				// drum.bang();
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
};




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
sequence.push(['tambo', 'clap', 'cowbl']);
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


function Sequencer () {
	this.sequence = [];
	this.seqMaxLen = 16;
	this.currentStep = 0;
	this.nextTimer = null; 	// will hold the timeout id for the next step, so the sequencer can be stopped.
	this.playing = false;
	this.tempo = 107;
	this.division = 4;	// as in 4 1/16th-notes per beat.

	var count = seqMaxLen;
	while( count-- ) this.sequence.push( [] );
}

Sequencer.prototype = new Evented();
Sequencer.prototype.constructor = Sequencer;

Sequencer.prototype.start = function start () {
	this.playing = true;
	this.interval = (60 / (this.tempo * this.division)) * 1000;
	this.playStep();
};

Sequencer.prototype.stop = function stop () {
	this.playing = false;
	clearTimeout( this.nextTimer );
};

Sequencer.prototype.playStep = function playStep () {
	var seqr = this;
	var stepDrums = this.sequence[ this.currentStep ];
	var drumCount = stepDrums.length;

	this.currentStep = ++this.currentStep % this.seqMaxLen;

	while( drumCount-- ) {
		stepDrums[ drumCount ].bang();
	}

	if( this.playing ) {
		this.nextTimer = setTimeout( $.proxy( seqr.playStep, seqr ), seqr.interval );
	}
};

Sequencer.prototype.setStep = function setStep ( stepId, drum ) {
	var step = this.sequence[ stepId ];
	var drumPosition = $.inArray( drum, step );

	// if the drum is already in the step array, remove it
	if( drumPosition > -1 ) {	step.splice( drumPosition, 1 ); }
	// otherwise, add it
	else if( drum ) step.push( drum );
};



// **********************************************
//
// bootstrap - start the app
//
// **********************************************

var drumObjects = {};
var sequencer = new Sequencer();

(function bootstrap () {
	var defaultSequence = [];
	defaultSequence.push(['tambo', 'mtm', 'cowbl']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo', 'clap', 'cowbl']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo', 'mtm']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push(['ltm']);
	defaultSequence.push(['tambo', 'mtm']);
	defaultSequence.push(['tambo']);
	defaultSequence.push(['tambo', 'clap']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push(['rimsh']);


	// list sounds, then load and play them
	var drums = {
		'clap'  : 'assets/707/707CLAP.WAV',
		'cowbl' : 'assets/707/707COWBL.WAV',
		'htm'   : 'assets/707/707HTM.WAV',
		'ltm'   : 'assets/707/707LTM.WAV',
		'mtm'   : 'assets/707/707MTM.WAV',
		'rimsh' : 'assets/707/707RIMSH.WAV',
		'tambo' : 'assets/707/707TAMBO.WAV'
	};

	// set up the Drum objects in the drum collection
	for( var drum in drums ) { if( drums.hasOwnProperty( drum ) ){
		// loadSound( drums[drum].path );
		drumObjects[ drum ] = new Drum( drums[drum], context );
	}}


	// 'load' the default sequence into the sequencer
	defaultSequence.forEach( function ( step, index ) {
		step.forEach( function ( stepDrum ) {
			sequencer.setStep( index, drumObjects[ stepDrum ] );
		});
	});

})();



// **********************************************
//
// Interface (event handling)
// - this could probably become a kind of master object, or controller
//
// **********************************************

function handleKeys ( event ) {
	switch( event.which ) {
	case 32:
		if( sequencer.playing ) sequencer.stop();
		else sequencer.start();
		break;
 	}
}

function handlePadHit ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();

	toggleMouseDownTrue();
	drumObjects[ event.target.id ].bang();

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

var mousedown = false;
function toggleMouseDownTrue () { mousedown = true; }
function toggleMouseDownFalse () { mousedown = false; }


var $pads;	// will be a $set of buttons for use as drum pads

(function padController () {
	var $document = $(document);
	var $padgrid = $('#padgrid');
	$pads = $padgrid.find('button');

	// Each pad 'listens' to its associated drum for 'bang' events
	//  and flashes when it hears one.
	$pads.each( function setDrumEvents ( index, pad ){
		var $pad = $(pad);
		drumObjects[ pad.id ].on( 'bang', function onBang ( /*event*/ ){
			$pad.addClass( 'struck' );
			$pad.one( transitionEnd, function () { $pad.removeClass( 'struck' ); });
		});
	});

	// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
	$document.on('mousedown', toggleMouseDownTrue );
	$document.on('mouseup', toggleMouseDownFalse );

	// delegate drum pad taps to padgrid
	$padgrid.on('mouseenter', 'button', function ( event ) {
		if( mousedown ) { handlePadHit( event ); }
	});
	$padgrid.on('mousedown', 'button', handlePadHit );
	$padgrid.on('touchstart', 'button', handlePadHit );
})();

(function sequencerController () {
	$(document).on('keydown', handleKeys );

})();





}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxudmFyIHRyYW5zaXRpb25FbmQgPSAnd2Via2l0VHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBvVHJhbnNpdGlvbkVuZCBtc1RyYW5zaXRpb25FbmQgdHJhbnNpdGlvbmVuZCc7XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBIZWxwZXIgb2JqZWN0c1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBFdmVudGVkXG4gKiBhZGRzIGV2ZW50IGhhbmRsaW5nIHRvIG9iamVjdHMsIGRlbGVnYXRpbmcgdG8gJFxuICovXG5mdW5jdGlvbiBFdmVudGVkICgpIHt9XG5FdmVudGVkLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IEV2ZW50ZWQsXG5cdG9uOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub24oIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdG9mZjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9mZiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0dHJpZ2dlcjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLnRyaWdnZXIoIGV2ZW50TmFtZSApOyByZXR1cm4gdGhpczsgfVxufTtcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc3ludGgnIHNlY3Rpb25cbi8vIGRydW0gc291bmRzLCBjaGFubmVsIHRvIHBsYXkgdGhlbSB0aHJvdWdoLCBsb2FkZXIgdG8gbG9hZCB0aGVtIGV0Y1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxudmFyIG1hdGNoRHJ1bUlEID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2k7XG5cbmZ1bmN0aW9uIGxvYWRTb3VuZCggc291bmRVcmwgKSB7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIGlkID0gbWF0Y2hEcnVtSUQuZXhlYyggc291bmRVcmwgKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRkcnVtc1sgaWQgXS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRiYW5nKCBkcnVtc1sgaWQgXSApO1xuXHRcdH0pO1xuXG5cdFx0bWF0Y2hEcnVtSUQubGFzdEluZGV4ID0gMDtcblx0fTtcblxuXHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNvdW5kVXJsLCB0cnVlKTtcblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cblxuZnVuY3Rpb24gYmFuZyggZHJ1bSApIHtcblx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7IC8vIGNyZWF0ZXMgYSBzb3VuZCBzb3VyY2VcblxuXHRzb3VyY2UuYnVmZmVyID0gZHJ1bS5idWZmZXI7ICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG59XG5cblxuXG5cbi8qKlxuICogQGNsYXNzIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR2YXIgZHJ1bSA9IHRoaXM7XG5cdHRoaXMucGF0aCA9IHBhdGg7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdHRoaXMubmFtZSA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pLmV4ZWMoIHBhdGggKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdChmdW5jdGlvbiBsb2FkU291bmQoKSB7XG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0XHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRkcnVtLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdFx0Ly8gZHJ1bS5iYW5nKCk7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3NlcXVlbmNlcicgc2VjdGlvblxuLy8gRGF0YSBzdHJ1Y3R1cmVzIGZvciB0aGUgc2VxdWVuY2UsIGEgZGVmYXVsdCBzZXF1ZW5jZSwgZnVuY3Rpb25zIGZvciBwbGF5YmFja1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxudmFyIHNlcXVlbmNlID0gW107XG52YXIgc2VxTWF4TGVuID0gMTY7XG52YXIgY3VycmVudFN0ZXAgPSAwO1xudmFyIG5leHRUaW1lcjsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG52YXIgcGxheWluZyA9IGZhbHNlO1xudmFyIHRlbXBvID0gMTA3O1xudmFyIGRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxudmFyIGN1cnJlbnREcnVtO1xuXG4vLyBhIGRlZmF1bHQgc2VxdWVuY2Vcbi8vXG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJywgJ2Nvd2JsJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJywgJ2Nvd2JsJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFsnbHRtJ10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFsncmltc2gnXSk7XG5cblxuXG5cblxuZnVuY3Rpb24gcGxheVN0ZXAgKCBzdGVwSW5kZXggKSB7XG5cdHZhciBoaXRzID0gc2VxdWVuY2VbIHN0ZXBJbmRleCBdO1xuXHR2YXIgaGl0Q291bnQgPSBoaXRzLmxlbmd0aDtcblxuXHRjdXJyZW50U3RlcCA9ICsrY3VycmVudFN0ZXAgJSBzZXFNYXhMZW47XG5cblx0d2hpbGUoIGhpdENvdW50LS0gKSB7XG5cdFx0Ly8gYmFuZyggZHJ1bXNbIGhpdHNbIGhpdENvdW50IF0gXSApO1xuXHRcdGRydW1PYmplY3RzWyBoaXRzWyBoaXRDb3VudCBdIF0uYmFuZygpO1xuXHR9XG5cblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0bmV4dFRpbWVyID0gc2V0VGltZW91dCggcGxheVN0ZXAsIGludGVydmFsLCBjdXJyZW50U3RlcCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVN0YXJ0U3RvcCAoKSB7XG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdHBsYXlpbmcgPSBmYWxzZTtcblx0XHRjbGVhclRpbWVvdXQoIG5leHRUaW1lciApO1xuXHR9IGVsc2Uge1xuXHRcdHBsYXlpbmcgPSB0cnVlO1xuXHRcdHN0YXJ0U2VxdWVuY2UoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydFNlcXVlbmNlICgpIHtcblx0aW50ZXJ2YWwgPSAoNjAgLyAodGVtcG8gKiBkaXZpc2lvbikpICogMTAwMDtcblx0cGxheVN0ZXAoIGN1cnJlbnRTdGVwICk7XG59XG5cblxuZnVuY3Rpb24gU2VxdWVuY2VyICgpIHtcblx0dGhpcy5zZXF1ZW5jZSA9IFtdO1xuXHR0aGlzLnNlcU1heExlbiA9IDE2O1xuXHR0aGlzLmN1cnJlbnRTdGVwID0gMDtcblx0dGhpcy5uZXh0VGltZXIgPSBudWxsOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdHRoaXMudGVtcG8gPSAxMDc7XG5cdHRoaXMuZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblx0dmFyIGNvdW50ID0gc2VxTWF4TGVuO1xuXHR3aGlsZSggY291bnQtLSApIHRoaXMuc2VxdWVuY2UucHVzaCggW10gKTtcbn1cblxuU2VxdWVuY2VyLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5TZXF1ZW5jZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2VxdWVuY2VyO1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSB0cnVlO1xuXHR0aGlzLmludGVydmFsID0gKDYwIC8gKHRoaXMudGVtcG8gKiB0aGlzLmRpdmlzaW9uKSkgKiAxMDAwO1xuXHR0aGlzLnBsYXlTdGVwKCk7XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wICgpIHtcblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdGNsZWFyVGltZW91dCggdGhpcy5uZXh0VGltZXIgKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUucGxheVN0ZXAgPSBmdW5jdGlvbiBwbGF5U3RlcCAoKSB7XG5cdHZhciBzZXFyID0gdGhpcztcblx0dmFyIHN0ZXBEcnVtcyA9IHRoaXMuc2VxdWVuY2VbIHRoaXMuY3VycmVudFN0ZXAgXTtcblx0dmFyIGRydW1Db3VudCA9IHN0ZXBEcnVtcy5sZW5ndGg7XG5cblx0dGhpcy5jdXJyZW50U3RlcCA9ICsrdGhpcy5jdXJyZW50U3RlcCAlIHRoaXMuc2VxTWF4TGVuO1xuXG5cdHdoaWxlKCBkcnVtQ291bnQtLSApIHtcblx0XHRzdGVwRHJ1bXNbIGRydW1Db3VudCBdLmJhbmcoKTtcblx0fVxuXG5cdGlmKCB0aGlzLnBsYXlpbmcgKSB7XG5cdFx0dGhpcy5uZXh0VGltZXIgPSBzZXRUaW1lb3V0KCAkLnByb3h5KCBzZXFyLnBsYXlTdGVwLCBzZXFyICksIHNlcXIuaW50ZXJ2YWwgKTtcblx0fVxufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5zZXRTdGVwID0gZnVuY3Rpb24gc2V0U3RlcCAoIHN0ZXBJZCwgZHJ1bSApIHtcblx0dmFyIHN0ZXAgPSB0aGlzLnNlcXVlbmNlWyBzdGVwSWQgXTtcblx0dmFyIGRydW1Qb3NpdGlvbiA9ICQuaW5BcnJheSggZHJ1bSwgc3RlcCApO1xuXG5cdC8vIGlmIHRoZSBkcnVtIGlzIGFscmVhZHkgaW4gdGhlIHN0ZXAgYXJyYXksIHJlbW92ZSBpdFxuXHRpZiggZHJ1bVBvc2l0aW9uID4gLTEgKSB7XHRzdGVwLnNwbGljZSggZHJ1bVBvc2l0aW9uLCAxICk7IH1cblx0Ly8gb3RoZXJ3aXNlLCBhZGQgaXRcblx0ZWxzZSBpZiggZHJ1bSApIHN0ZXAucHVzaCggZHJ1bSApO1xufTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBib290c3RyYXAgLSBzdGFydCB0aGUgYXBwXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG52YXIgZHJ1bU9iamVjdHMgPSB7fTtcbnZhciBzZXF1ZW5jZXIgPSBuZXcgU2VxdWVuY2VyKCk7XG5cbihmdW5jdGlvbiBib290c3RyYXAgKCkge1xuXHR2YXIgZGVmYXVsdFNlcXVlbmNlID0gW107XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJywgJ2Nvd2JsJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJywgJ2Nvd2JsJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsnbHRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsncmltc2gnXSk7XG5cblxuXHQvLyBsaXN0IHNvdW5kcywgdGhlbiBsb2FkIGFuZCBwbGF5IHRoZW1cblx0dmFyIGRydW1zID0ge1xuXHRcdCdjbGFwJyAgOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsXG5cdFx0J2Nvd2JsJyA6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsXG5cdFx0J2h0bScgICA6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLFxuXHRcdCdsdG0nICAgOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJyxcblx0XHQnbXRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsXG5cdFx0J3JpbXNoJyA6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsXG5cdFx0J3RhbWJvJyA6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVidcblx0fTtcblxuXHQvLyBzZXQgdXAgdGhlIERydW0gb2JqZWN0cyBpbiB0aGUgZHJ1bSBjb2xsZWN0aW9uXG5cdGZvciggdmFyIGRydW0gaW4gZHJ1bXMgKSB7IGlmKCBkcnVtcy5oYXNPd25Qcm9wZXJ0eSggZHJ1bSApICl7XG5cdFx0Ly8gbG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG5cdFx0ZHJ1bU9iamVjdHNbIGRydW0gXSA9IG5ldyBEcnVtKCBkcnVtc1tkcnVtXSwgY29udGV4dCApO1xuXHR9fVxuXG5cblx0Ly8gJ2xvYWQnIHRoZSBkZWZhdWx0IHNlcXVlbmNlIGludG8gdGhlIHNlcXVlbmNlclxuXHRkZWZhdWx0U2VxdWVuY2UuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwLCBpbmRleCApIHtcblx0XHRzdGVwLmZvckVhY2goIGZ1bmN0aW9uICggc3RlcERydW0gKSB7XG5cdFx0XHRzZXF1ZW5jZXIuc2V0U3RlcCggaW5kZXgsIGRydW1PYmplY3RzWyBzdGVwRHJ1bSBdICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59KSgpO1xuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0aWYoIHNlcXVlbmNlci5wbGF5aW5nICkgc2VxdWVuY2VyLnN0b3AoKTtcblx0XHRlbHNlIHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cblx0dG9nZ2xlTW91c2VEb3duVHJ1ZSgpO1xuXHRkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF0uYmFuZygpO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cbmZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH1cblxuXG52YXIgJHBhZHM7XHQvLyB3aWxsIGJlIGEgJHNldCBvZiBidXR0b25zIGZvciB1c2UgYXMgZHJ1bSBwYWRzXG5cbihmdW5jdGlvbiBwYWRDb250cm9sbGVyICgpIHtcblx0dmFyICRkb2N1bWVudCA9ICQoZG9jdW1lbnQpO1xuXHR2YXIgJHBhZGdyaWQgPSAkKCcjcGFkZ3JpZCcpO1xuXHQkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xuXG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5cdFx0XHQkcGFkLmFkZENsYXNzKCAnc3RydWNrJyApO1xuXHRcdFx0JHBhZC5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJHBhZC5yZW1vdmVDbGFzcyggJ3N0cnVjaycgKTsgfSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuXHQkZG9jdW1lbnQub24oJ21vdXNlZG93bicsIHRvZ2dsZU1vdXNlRG93blRydWUgKTtcblx0JGRvY3VtZW50Lm9uKCdtb3VzZXVwJywgdG9nZ2xlTW91c2VEb3duRmFsc2UgKTtcblxuXHQvLyBkZWxlZ2F0ZSBkcnVtIHBhZCB0YXBzIHRvIHBhZGdyaWRcblx0JHBhZGdyaWQub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRpZiggbW91c2Vkb3duICkgeyBoYW5kbGVQYWRIaXQoIGV2ZW50ICk7IH1cblx0fSk7XG5cdCRwYWRncmlkLm9uKCdtb3VzZWRvd24nLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG5cdCRwYWRncmlkLm9uKCd0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xufSkoKTtcblxuKGZ1bmN0aW9uIHNlcXVlbmNlckNvbnRyb2xsZXIgKCkge1xuXHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcblxufSkoKTtcblxuXG5cblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=