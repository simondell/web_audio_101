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
	trigger: function ( eventName, args ) { $(this).trigger( eventName, args ); return this; }
};




// **********************************************
//
// The 'synth' section
// Drum sounds
// (The loader is now part of the Drum object, and the context/channel to play
//  through is defined below in the 'bootstrap' section because that stuff is more
//  like app code or a main(). Other sound manipulation code may appear here later)
//
// **********************************************


/**
 * @type Drum
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

/**
 * @type Sequencer
 * @extends Evented
 * handles the sequence
 */
function Sequencer () {
	this.sequence = [];
	this.seqMaxLen = 16;
	this.currentStep = 0;
	this.nextTimer = null; 	// will hold the timeout id for the next step, so the sequencer can be stopped.
	this.playing = false;
	this.tempo = 107;
	this.division = 4;	// as in 4 1/16th-notes per beat.

	var count = this.seqMaxLen;
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

	this.trigger('playStep', this.currentStep );

	while( drumCount-- ) {
		stepDrums[ drumCount ].bang();
	}

	this.currentStep = ++this.currentStep % this.seqMaxLen;

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

// app-level objects, collections etc
var drumObjects = {};
var sequencer = new Sequencer();
var context = new AudioContext();
var previousDrum = null;

// cached $(elements)
var $document = $(document);
var $padgrid = $('#padgrid');
var $pads = $padgrid.find('button');
var $stepline = $('#stepline');
var $stepButtons = $stepline.find('button');

// app-level flags
var mousedown = false;

// Set up the app.
// This didn't need to be within an IIFE: plain old imperative code would have worked.
// The wrapping in an IIFE hints at how the code could be modularised later. The same applies to the
//  'controller' functions, further down the file.
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
	var drumPaths = {
		'clap'  : 'assets/707/707CLAP.WAV',
		'cowbl' : 'assets/707/707COWBL.WAV',
		'htm'   : 'assets/707/707HTM.WAV',
		'ltm'   : 'assets/707/707LTM.WAV',
		'mtm'   : 'assets/707/707MTM.WAV',
		'rimsh' : 'assets/707/707RIMSH.WAV',
		'tambo' : 'assets/707/707TAMBO.WAV'
	};

	// set up the Drum objects in the drum collection
	for( var drum in drumPaths ) { if( drumPaths.hasOwnProperty( drum ) ){
		// loadSound( drums[drum].path );
		drumObjects[ drum ] = new Drum( drumPaths[ drum ], context );
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


// event handlers
//
function handleKeys ( event ) {
	switch( event.which ) {
	case 32:
		if( sequencer.playing ) sequencer.stop();
		else sequencer.start();
		break;
 	}
}


function handlePadHit ( event ) {
	nix( event );
	drumObjects[ event.target.id ].bang();

	if( previousDrum && previousDrum.name !== event.target.id ) {
		$padgrid.find( '#' + previousDrum.name ).toggleClass( 'previous', false );
	}
	previousDrum = drumObjects[ event.target.id ];
	$padgrid.find( '#' + event.target.id ).toggleClass( 'previous', true );

	showDrumSteps();

	if( /mouse/.test( event.type ) ) toggleMouseDownTrue();
}


function handleStep ( event, stepId ) {
	var stepButton = $stepButtons.eq( stepId );
	flash( stepButton.find('span'), 'orange' );
}


function handleStepTap () {
	var stepId = parseInt( this.id.substr(4), 10 );
	nix( event );
	if( !previousDrum ) return;
	flash( this, 'darkgrey')
	sequencer.setStep( stepId, previousDrum );
	showDrumSteps();
}


// helper functions
// (usually called within a handler, but sometimes called AS a handler)
//
function nix ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.target.blur();
}


function flash ( elem, colour ) {
	var $elem = $( elem );
	var flashClass = 'flash--' + colour;
	$elem.addClass( flashClass );
	$elem.one( transitionEnd, function () { $elem.removeClass( flashClass ); });
}


function toggleMouseDownTrue () { mousedown = true; }


function toggleMouseDownFalse () { mousedown = false; }


function showDrumSteps () {
	var drumSteps = sequencer.sequence.reduce( filterForLastDrum, [] );

	$stepButtons.each( function turnOffLED ( index, button ) {
		if( drumSteps[0] === index ) {
			$(button).find('.led').toggleClass('led-on', true );
			drumSteps.shift();
		} else {
			$(button).find('.led').toggleClass('led-on', false );
		}
	});
}

// callback for [].filter which
function filterForLastDrum ( accum, currentStepDrums, index ) {
	// current === stepDrums i.e. an array of drums at step[ index ]
	if( currentStepDrums.some( findDrum ) ) accum.push( index );
	return accum;
}

// callback for [].some, returning true if the passed-in drum matches previousDrum
function findDrum ( inspected ) {
	return inspected.name === previousDrum.name;
}


//
// 'controllers'
//

// sets up bindings between the 'drum pad' buttons and the drums and sequencer
(function padController () {
	// Each pad 'listens' to its associated drum for 'bang' events
	//  and flashes when it hears one.
	$pads.each( function setDrumEvents ( index, pad ){
		var $pad = $(pad);
		drumObjects[ pad.id ].on( 'bang', function onBang ( /*event*/ ){
			flash( pad, 'red' );
		});
	});

	// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
	$document.on('mousedown', toggleMouseDownTrue );
	$document.on('mouseup', toggleMouseDownFalse );

	// delegate drum pad taps to padgrid
	$padgrid.on('mouseenter', 'button', function ( event ) {
		if( mousedown ) { handlePadHit( event ); }
	});
	$padgrid.on('mousedown touchstart', 'button', handlePadHit );
})();


(function sequencerController () {
	$(document).on('keydown', handleKeys );
	$stepline.on('mousedown touchstart', 'button', handleStepTap );

	sequencer.on('playStep', handleStep );
})();


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxudmFyIHRyYW5zaXRpb25FbmQgPSAnd2Via2l0VHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBvVHJhbnNpdGlvbkVuZCBtc1RyYW5zaXRpb25FbmQgdHJhbnNpdGlvbmVuZCc7XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBIZWxwZXIgb2JqZWN0c1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBFdmVudGVkXG4gKiBhZGRzIGV2ZW50IGhhbmRsaW5nIHRvIG9iamVjdHMsIGRlbGVnYXRpbmcgdG8gJFxuICovXG5mdW5jdGlvbiBFdmVudGVkICgpIHt9XG5FdmVudGVkLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IEV2ZW50ZWQsXG5cdG9uOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub24oIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdG9mZjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9mZiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0dHJpZ2dlcjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGFyZ3MgKSB7ICQodGhpcykudHJpZ2dlciggZXZlbnROYW1lLCBhcmdzICk7IHJldHVybiB0aGlzOyB9XG59O1xuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzeW50aCcgc2VjdGlvblxuLy8gRHJ1bSBzb3VuZHNcbi8vIChUaGUgbG9hZGVyIGlzIG5vdyBwYXJ0IG9mIHRoZSBEcnVtIG9iamVjdCwgYW5kIHRoZSBjb250ZXh0L2NoYW5uZWwgdG8gcGxheVxuLy8gIHRocm91Z2ggaXMgZGVmaW5lZCBiZWxvdyBpbiB0aGUgJ2Jvb3RzdHJhcCcgc2VjdGlvbiBiZWNhdXNlIHRoYXQgc3R1ZmYgaXMgbW9yZVxuLy8gIGxpa2UgYXBwIGNvZGUgb3IgYSBtYWluKCkuIE90aGVyIHNvdW5kIG1hbmlwdWxhdGlvbiBjb2RlIG1heSBhcHBlYXIgaGVyZSBsYXRlcilcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLyoqXG4gKiBAdHlwZSBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dmFyIGRydW0gPSB0aGlzO1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLm5hbWUgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaS5leGVjKCBwYXRoIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHQoZnVuY3Rpb24gbG9hZFNvdW5kKCkge1xuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdFx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdFx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdFx0ZHJ1bS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3NlcXVlbmNlcicgc2VjdGlvblxuLy8gRGF0YSBzdHJ1Y3R1cmVzIGZvciB0aGUgc2VxdWVuY2UsIGEgZGVmYXVsdCBzZXF1ZW5jZSwgZnVuY3Rpb25zIGZvciBwbGF5YmFja1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBAdHlwZSBTZXF1ZW5jZXJcbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgdGhlIHNlcXVlbmNlXG4gKi9cbmZ1bmN0aW9uIFNlcXVlbmNlciAoKSB7XG5cdHRoaXMuc2VxdWVuY2UgPSBbXTtcblx0dGhpcy5zZXFNYXhMZW4gPSAxNjtcblx0dGhpcy5jdXJyZW50U3RlcCA9IDA7XG5cdHRoaXMubmV4dFRpbWVyID0gbnVsbDsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG5cdHRoaXMucGxheWluZyA9IGZhbHNlO1xuXHR0aGlzLnRlbXBvID0gMTA3O1xuXHR0aGlzLmRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxuXG5cdHZhciBjb3VudCA9IHRoaXMuc2VxTWF4TGVuO1xuXHR3aGlsZSggY291bnQtLSApIHRoaXMuc2VxdWVuY2UucHVzaCggW10gKTtcbn1cblxuU2VxdWVuY2VyLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5TZXF1ZW5jZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2VxdWVuY2VyO1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSB0cnVlO1xuXHR0aGlzLmludGVydmFsID0gKDYwIC8gKHRoaXMudGVtcG8gKiB0aGlzLmRpdmlzaW9uKSkgKiAxMDAwO1xuXHR0aGlzLnBsYXlTdGVwKCk7XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wICgpIHtcblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdGNsZWFyVGltZW91dCggdGhpcy5uZXh0VGltZXIgKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUucGxheVN0ZXAgPSBmdW5jdGlvbiBwbGF5U3RlcCAoKSB7XG5cdHZhciBzZXFyID0gdGhpcztcblx0dmFyIHN0ZXBEcnVtcyA9IHRoaXMuc2VxdWVuY2VbIHRoaXMuY3VycmVudFN0ZXAgXTtcblx0dmFyIGRydW1Db3VudCA9IHN0ZXBEcnVtcy5sZW5ndGg7XG5cblx0dGhpcy50cmlnZ2VyKCdwbGF5U3RlcCcsIHRoaXMuY3VycmVudFN0ZXAgKTtcblxuXHR3aGlsZSggZHJ1bUNvdW50LS0gKSB7XG5cdFx0c3RlcERydW1zWyBkcnVtQ291bnQgXS5iYW5nKCk7XG5cdH1cblxuXHR0aGlzLmN1cnJlbnRTdGVwID0gKyt0aGlzLmN1cnJlbnRTdGVwICUgdGhpcy5zZXFNYXhMZW47XG5cblx0aWYoIHRoaXMucGxheWluZyApIHtcblx0XHR0aGlzLm5leHRUaW1lciA9IHNldFRpbWVvdXQoICQucHJveHkoIHNlcXIucGxheVN0ZXAsIHNlcXIgKSwgc2Vxci5pbnRlcnZhbCApO1xuXHR9XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnNldFN0ZXAgPSBmdW5jdGlvbiBzZXRTdGVwICggc3RlcElkLCBkcnVtICkge1xuXHR2YXIgc3RlcCA9IHRoaXMuc2VxdWVuY2VbIHN0ZXBJZCBdO1xuXHR2YXIgZHJ1bVBvc2l0aW9uID0gJC5pbkFycmF5KCBkcnVtLCBzdGVwICk7XG5cblx0Ly8gaWYgdGhlIGRydW0gaXMgYWxyZWFkeSBpbiB0aGUgc3RlcCBhcnJheSwgcmVtb3ZlIGl0XG5cdGlmKCBkcnVtUG9zaXRpb24gPiAtMSApIHtcdHN0ZXAuc3BsaWNlKCBkcnVtUG9zaXRpb24sIDEgKTsgfVxuXHQvLyBvdGhlcndpc2UsIGFkZCBpdFxuXHRlbHNlIGlmKCBkcnVtICkgc3RlcC5wdXNoKCBkcnVtICk7XG59O1xuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIGJvb3RzdHJhcCAtIHN0YXJ0IHRoZSBhcHBcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8vIGFwcC1sZXZlbCBvYmplY3RzLCBjb2xsZWN0aW9ucyBldGNcbnZhciBkcnVtT2JqZWN0cyA9IHt9O1xudmFyIHNlcXVlbmNlciA9IG5ldyBTZXF1ZW5jZXIoKTtcbnZhciBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xudmFyIHByZXZpb3VzRHJ1bSA9IG51bGw7XG5cbi8vIGNhY2hlZCAkKGVsZW1lbnRzKVxudmFyICRkb2N1bWVudCA9ICQoZG9jdW1lbnQpO1xudmFyICRwYWRncmlkID0gJCgnI3BhZGdyaWQnKTtcbnZhciAkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xudmFyICRzdGVwbGluZSA9ICQoJyNzdGVwbGluZScpO1xudmFyICRzdGVwQnV0dG9ucyA9ICRzdGVwbGluZS5maW5kKCdidXR0b24nKTtcblxuLy8gYXBwLWxldmVsIGZsYWdzXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5cbi8vIFNldCB1cCB0aGUgYXBwLlxuLy8gVGhpcyBkaWRuJ3QgbmVlZCB0byBiZSB3aXRoaW4gYW4gSUlGRTogcGxhaW4gb2xkIGltcGVyYXRpdmUgY29kZSB3b3VsZCBoYXZlIHdvcmtlZC5cbi8vIFRoZSB3cmFwcGluZyBpbiBhbiBJSUZFIGhpbnRzIGF0IGhvdyB0aGUgY29kZSBjb3VsZCBiZSBtb2R1bGFyaXNlZCBsYXRlci4gVGhlIHNhbWUgYXBwbGllcyB0byB0aGVcbi8vICAnY29udHJvbGxlcicgZnVuY3Rpb25zLCBmdXJ0aGVyIGRvd24gdGhlIGZpbGUuXG4oZnVuY3Rpb24gYm9vdHN0cmFwICgpIHtcblx0dmFyIGRlZmF1bHRTZXF1ZW5jZSA9IFtdO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCcsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ2x0bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5cblx0Ly8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG5cdHZhciBkcnVtUGF0aHMgPSB7XG5cdFx0J2NsYXAnICA6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJyxcblx0XHQnY293YmwnIDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJyxcblx0XHQnaHRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsXG5cdFx0J2x0bScgICA6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLFxuXHRcdCdtdG0nICAgOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJyxcblx0XHQncmltc2gnIDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJyxcblx0XHQndGFtYm8nIDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJ1xuXHR9O1xuXG5cdC8vIHNldCB1cCB0aGUgRHJ1bSBvYmplY3RzIGluIHRoZSBkcnVtIGNvbGxlY3Rpb25cblx0Zm9yKCB2YXIgZHJ1bSBpbiBkcnVtUGF0aHMgKSB7IGlmKCBkcnVtUGF0aHMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHRcdC8vIGxvYWRTb3VuZCggZHJ1bXNbZHJ1bV0ucGF0aCApO1xuXHRcdGRydW1PYmplY3RzWyBkcnVtIF0gPSBuZXcgRHJ1bSggZHJ1bVBhdGhzWyBkcnVtIF0sIGNvbnRleHQgKTtcblx0fX1cblxuXG5cdC8vICdsb2FkJyB0aGUgZGVmYXVsdCBzZXF1ZW5jZSBpbnRvIHRoZSBzZXF1ZW5jZXJcblx0ZGVmYXVsdFNlcXVlbmNlLmZvckVhY2goIGZ1bmN0aW9uICggc3RlcCwgaW5kZXggKSB7XG5cdFx0c3RlcC5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXBEcnVtICkge1xuXHRcdFx0c2VxdWVuY2VyLnNldFN0ZXAoIGluZGV4LCBkcnVtT2JqZWN0c1sgc3RlcERydW0gXSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSkoKTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG4vLyBldmVudCBoYW5kbGVyc1xuLy9cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcblx0c3dpdGNoKCBldmVudC53aGljaCApIHtcblx0Y2FzZSAzMjpcblx0XHRpZiggc2VxdWVuY2VyLnBsYXlpbmcgKSBzZXF1ZW5jZXIuc3RvcCgpO1xuXHRcdGVsc2Ugc2VxdWVuY2VyLnN0YXJ0KCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdG5peCggZXZlbnQgKTtcblx0ZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdLmJhbmcoKTtcblxuXHRpZiggcHJldmlvdXNEcnVtICYmIHByZXZpb3VzRHJ1bS5uYW1lICE9PSBldmVudC50YXJnZXQuaWQgKSB7XG5cdFx0JHBhZGdyaWQuZmluZCggJyMnICsgcHJldmlvdXNEcnVtLm5hbWUgKS50b2dnbGVDbGFzcyggJ3ByZXZpb3VzJywgZmFsc2UgKTtcblx0fVxuXHRwcmV2aW91c0RydW0gPSBkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF07XG5cdCRwYWRncmlkLmZpbmQoICcjJyArIGV2ZW50LnRhcmdldC5pZCApLnRvZ2dsZUNsYXNzKCAncHJldmlvdXMnLCB0cnVlICk7XG5cblx0c2hvd0RydW1TdGVwcygpO1xuXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIHRvZ2dsZU1vdXNlRG93blRydWUoKTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVTdGVwICggZXZlbnQsIHN0ZXBJZCApIHtcblx0dmFyIHN0ZXBCdXR0b24gPSAkc3RlcEJ1dHRvbnMuZXEoIHN0ZXBJZCApO1xuXHRmbGFzaCggc3RlcEJ1dHRvbi5maW5kKCdzcGFuJyksICdvcmFuZ2UnICk7XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcFRhcCAoKSB7XG5cdHZhciBzdGVwSWQgPSBwYXJzZUludCggdGhpcy5pZC5zdWJzdHIoNCksIDEwICk7XG5cdG5peCggZXZlbnQgKTtcblx0aWYoICFwcmV2aW91c0RydW0gKSByZXR1cm47XG5cdGZsYXNoKCB0aGlzLCAnZGFya2dyZXknKVxuXHRzZXF1ZW5jZXIuc2V0U3RlcCggc3RlcElkLCBwcmV2aW91c0RydW0gKTtcblx0c2hvd0RydW1TdGVwcygpO1xufVxuXG5cbi8vIGhlbHBlciBmdW5jdGlvbnNcbi8vICh1c3VhbGx5IGNhbGxlZCB3aXRoaW4gYSBoYW5kbGVyLCBidXQgc29tZXRpbWVzIGNhbGxlZCBBUyBhIGhhbmRsZXIpXG4vL1xuZnVuY3Rpb24gbml4ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cbmZ1bmN0aW9uIGZsYXNoICggZWxlbSwgY29sb3VyICkge1xuXHR2YXIgJGVsZW0gPSAkKCBlbGVtICk7XG5cdHZhciBmbGFzaENsYXNzID0gJ2ZsYXNoLS0nICsgY29sb3VyO1xuXHQkZWxlbS5hZGRDbGFzcyggZmxhc2hDbGFzcyApO1xuXHQkZWxlbS5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJGVsZW0ucmVtb3ZlQ2xhc3MoIGZsYXNoQ2xhc3MgKTsgfSk7XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cblxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuZnVuY3Rpb24gc2hvd0RydW1TdGVwcyAoKSB7XG5cdHZhciBkcnVtU3RlcHMgPSBzZXF1ZW5jZXIuc2VxdWVuY2UucmVkdWNlKCBmaWx0ZXJGb3JMYXN0RHJ1bSwgW10gKTtcblxuXHQkc3RlcEJ1dHRvbnMuZWFjaCggZnVuY3Rpb24gdHVybk9mZkxFRCAoIGluZGV4LCBidXR0b24gKSB7XG5cdFx0aWYoIGRydW1TdGVwc1swXSA9PT0gaW5kZXggKSB7XG5cdFx0XHQkKGJ1dHRvbikuZmluZCgnLmxlZCcpLnRvZ2dsZUNsYXNzKCdsZWQtb24nLCB0cnVlICk7XG5cdFx0XHRkcnVtU3RlcHMuc2hpZnQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgZmFsc2UgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uZmlsdGVyIHdoaWNoXG5mdW5jdGlvbiBmaWx0ZXJGb3JMYXN0RHJ1bSAoIGFjY3VtLCBjdXJyZW50U3RlcERydW1zLCBpbmRleCApIHtcblx0Ly8gY3VycmVudCA9PT0gc3RlcERydW1zIGkuZS4gYW4gYXJyYXkgb2YgZHJ1bXMgYXQgc3RlcFsgaW5kZXggXVxuXHRpZiggY3VycmVudFN0ZXBEcnVtcy5zb21lKCBmaW5kRHJ1bSApICkgYWNjdW0ucHVzaCggaW5kZXggKTtcblx0cmV0dXJuIGFjY3VtO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uc29tZSwgcmV0dXJuaW5nIHRydWUgaWYgdGhlIHBhc3NlZC1pbiBkcnVtIG1hdGNoZXMgcHJldmlvdXNEcnVtXG5mdW5jdGlvbiBmaW5kRHJ1bSAoIGluc3BlY3RlZCApIHtcblx0cmV0dXJuIGluc3BlY3RlZC5uYW1lID09PSBwcmV2aW91c0RydW0ubmFtZTtcbn1cblxuXG4vL1xuLy8gJ2NvbnRyb2xsZXJzJ1xuLy9cblxuLy8gc2V0cyB1cCBiaW5kaW5ncyBiZXR3ZWVuIHRoZSAnZHJ1bSBwYWQnIGJ1dHRvbnMgYW5kIHRoZSBkcnVtcyBhbmQgc2VxdWVuY2VyXG4oZnVuY3Rpb24gcGFkQ29udHJvbGxlciAoKSB7XG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5cdFx0XHRmbGFzaCggcGFkLCAncmVkJyApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyB0b2dnbGUgbW91c2Vkb3duIGZsYWcsIHVzZWQgZm9yIGRyYWdnaW5nIGFuICdhY3RpdmVcIiBtb3VzZSBvdmVyIG1hY2hpbmUgY29udHJvbHNcblx0JGRvY3VtZW50Lm9uKCdtb3VzZWRvd24nLCB0b2dnbGVNb3VzZURvd25UcnVlICk7XG5cdCRkb2N1bWVudC5vbignbW91c2V1cCcsIHRvZ2dsZU1vdXNlRG93bkZhbHNlICk7XG5cblx0Ly8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG5cdCRwYWRncmlkLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG5cdH0pO1xuXHQkcGFkZ3JpZC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG59KSgpO1xuXG5cbihmdW5jdGlvbiBzZXF1ZW5jZXJDb250cm9sbGVyICgpIHtcblx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cdCRzdGVwbGluZS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlU3RlcFRhcCApO1xuXG5cdHNlcXVlbmNlci5vbigncGxheVN0ZXAnLCBoYW5kbGVTdGVwICk7XG59KSgpO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==