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
	var boundPlayStep = $.proxy( seqr.playStep, seqr );

	this.trigger('playStep', this.currentStep );

	while( drumCount-- ) {
		stepDrums[ drumCount ].bang();
	}

	this.currentStep = ++this.currentStep % this.seqMaxLen;

	if( this.playing ) {
		this.nextTimer = setTimeout( boundPlayStep, seqr.interval );
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
var $controls = $('#sequencer--controls');

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


function handleControls ( event ) {
	nix( event );

	switch( event.target.id ) {
	case "rwnd":
		flash( event.target, 'orange' );
		sequencer.currentStep = 0;
		break;
	case "play":
		if(sequencer.playing) return;
		flash( event.target, 'green' );
		sequencer.start();
		break;
	case "stop":
		flash( event.target, 'red' );
		sequencer.stop();
		break;
	}
}



function handleStepTap () {
	var stepId = parseInt( this.id.substr(4), 10 );
	nix( event );
	if( !previousDrum ) return;
	flash( this, 'darkgrey');
	sequencer.setStep( stepId, previousDrum );
	showDrumSteps();
}


function handleStep ( event, stepId ) {
	var stepButton = $stepButtons.eq( stepId );
	flash( stepButton.find('span'), 'orange' );
	if( stepId % 4 === 0 ) flash( $controls.find('#play'), 'green' );
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
	// show tempo
	$controls.find('#tempo').text( sequencer.tempo );

	// DOM events
	$(document).on('keydown', handleKeys );
	$stepline.on('mousedown touchstart', 'button', handleStepTap );
	$controls.on('mousedown touchstart', 'button', handleControls );

	// internal events
	sequencer.on( 'playStep', handleStep );
})();


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxudmFyIHRyYW5zaXRpb25FbmQgPSAnd2Via2l0VHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBvVHJhbnNpdGlvbkVuZCBtc1RyYW5zaXRpb25FbmQgdHJhbnNpdGlvbmVuZCc7XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBIZWxwZXIgb2JqZWN0c1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBFdmVudGVkXG4gKiBhZGRzIGV2ZW50IGhhbmRsaW5nIHRvIG9iamVjdHMsIGRlbGVnYXRpbmcgdG8gJFxuICovXG5mdW5jdGlvbiBFdmVudGVkICgpIHt9XG5FdmVudGVkLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IEV2ZW50ZWQsXG5cdG9uOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub24oIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdG9mZjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9mZiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0dHJpZ2dlcjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGFyZ3MgKSB7ICQodGhpcykudHJpZ2dlciggZXZlbnROYW1lLCBhcmdzICk7IHJldHVybiB0aGlzOyB9XG59O1xuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzeW50aCcgc2VjdGlvblxuLy8gRHJ1bSBzb3VuZHNcbi8vIChUaGUgbG9hZGVyIGlzIG5vdyBwYXJ0IG9mIHRoZSBEcnVtIG9iamVjdCwgYW5kIHRoZSBjb250ZXh0L2NoYW5uZWwgdG8gcGxheVxuLy8gIHRocm91Z2ggaXMgZGVmaW5lZCBiZWxvdyBpbiB0aGUgJ2Jvb3RzdHJhcCcgc2VjdGlvbiBiZWNhdXNlIHRoYXQgc3R1ZmYgaXMgbW9yZVxuLy8gIGxpa2UgYXBwIGNvZGUgb3IgYSBtYWluKCkuIE90aGVyIHNvdW5kIG1hbmlwdWxhdGlvbiBjb2RlIG1heSBhcHBlYXIgaGVyZSBsYXRlcilcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLyoqXG4gKiBAdHlwZSBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dmFyIGRydW0gPSB0aGlzO1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLm5hbWUgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaS5leGVjKCBwYXRoIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHQoZnVuY3Rpb24gbG9hZFNvdW5kKCkge1xuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdFx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdFx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdFx0ZHJ1bS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3NlcXVlbmNlcicgc2VjdGlvblxuLy8gRGF0YSBzdHJ1Y3R1cmVzIGZvciB0aGUgc2VxdWVuY2UsIGEgZGVmYXVsdCBzZXF1ZW5jZSwgZnVuY3Rpb25zIGZvciBwbGF5YmFja1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBAdHlwZSBTZXF1ZW5jZXJcbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgdGhlIHNlcXVlbmNlXG4gKi9cbmZ1bmN0aW9uIFNlcXVlbmNlciAoKSB7XG5cdHRoaXMuc2VxdWVuY2UgPSBbXTtcblx0dGhpcy5zZXFNYXhMZW4gPSAxNjtcblx0dGhpcy5jdXJyZW50U3RlcCA9IDA7XG5cdHRoaXMubmV4dFRpbWVyID0gbnVsbDsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG5cdHRoaXMucGxheWluZyA9IGZhbHNlO1xuXHR0aGlzLnRlbXBvID0gMTA3O1xuXHR0aGlzLmRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxuXG5cdHZhciBjb3VudCA9IHRoaXMuc2VxTWF4TGVuO1xuXHR3aGlsZSggY291bnQtLSApIHRoaXMuc2VxdWVuY2UucHVzaCggW10gKTtcbn1cblxuU2VxdWVuY2VyLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5TZXF1ZW5jZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2VxdWVuY2VyO1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSB0cnVlO1xuXHR0aGlzLmludGVydmFsID0gKDYwIC8gKHRoaXMudGVtcG8gKiB0aGlzLmRpdmlzaW9uKSkgKiAxMDAwO1xuXHR0aGlzLnBsYXlTdGVwKCk7XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wICgpIHtcblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdGNsZWFyVGltZW91dCggdGhpcy5uZXh0VGltZXIgKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUucGxheVN0ZXAgPSBmdW5jdGlvbiBwbGF5U3RlcCAoKSB7XG5cdHZhciBzZXFyID0gdGhpcztcblx0dmFyIHN0ZXBEcnVtcyA9IHRoaXMuc2VxdWVuY2VbIHRoaXMuY3VycmVudFN0ZXAgXTtcblx0dmFyIGRydW1Db3VudCA9IHN0ZXBEcnVtcy5sZW5ndGg7XG5cdHZhciBib3VuZFBsYXlTdGVwID0gJC5wcm94eSggc2Vxci5wbGF5U3RlcCwgc2VxciApO1xuXG5cdHRoaXMudHJpZ2dlcigncGxheVN0ZXAnLCB0aGlzLmN1cnJlbnRTdGVwICk7XG5cblx0d2hpbGUoIGRydW1Db3VudC0tICkge1xuXHRcdHN0ZXBEcnVtc1sgZHJ1bUNvdW50IF0uYmFuZygpO1xuXHR9XG5cblx0dGhpcy5jdXJyZW50U3RlcCA9ICsrdGhpcy5jdXJyZW50U3RlcCAlIHRoaXMuc2VxTWF4TGVuO1xuXG5cdGlmKCB0aGlzLnBsYXlpbmcgKSB7XG5cdFx0dGhpcy5uZXh0VGltZXIgPSBzZXRUaW1lb3V0KCBib3VuZFBsYXlTdGVwLCBzZXFyLmludGVydmFsICk7XG5cdH1cbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc2V0U3RlcCA9IGZ1bmN0aW9uIHNldFN0ZXAgKCBzdGVwSWQsIGRydW0gKSB7XG5cdHZhciBzdGVwID0gdGhpcy5zZXF1ZW5jZVsgc3RlcElkIF07XG5cdHZhciBkcnVtUG9zaXRpb24gPSAkLmluQXJyYXkoIGRydW0sIHN0ZXAgKTtcblxuXHQvLyBpZiB0aGUgZHJ1bSBpcyBhbHJlYWR5IGluIHRoZSBzdGVwIGFycmF5LCByZW1vdmUgaXRcblx0aWYoIGRydW1Qb3NpdGlvbiA+IC0xICkge1x0c3RlcC5zcGxpY2UoIGRydW1Qb3NpdGlvbiwgMSApOyB9XG5cdC8vIG90aGVyd2lzZSwgYWRkIGl0XG5cdGVsc2UgaWYoIGRydW0gKSBzdGVwLnB1c2goIGRydW0gKTtcbn07XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gYm9vdHN0cmFwIC0gc3RhcnQgdGhlIGFwcFxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLy8gYXBwLWxldmVsIG9iamVjdHMsIGNvbGxlY3Rpb25zIGV0Y1xudmFyIGRydW1PYmplY3RzID0ge307XG52YXIgc2VxdWVuY2VyID0gbmV3IFNlcXVlbmNlcigpO1xudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG52YXIgcHJldmlvdXNEcnVtID0gbnVsbDtcblxuLy8gY2FjaGVkICQoZWxlbWVudHMpXG52YXIgJGRvY3VtZW50ID0gJChkb2N1bWVudCk7XG52YXIgJHBhZGdyaWQgPSAkKCcjcGFkZ3JpZCcpO1xudmFyICRwYWRzID0gJHBhZGdyaWQuZmluZCgnYnV0dG9uJyk7XG52YXIgJHN0ZXBsaW5lID0gJCgnI3N0ZXBsaW5lJyk7XG52YXIgJHN0ZXBCdXR0b25zID0gJHN0ZXBsaW5lLmZpbmQoJ2J1dHRvbicpO1xudmFyICRjb250cm9scyA9ICQoJyNzZXF1ZW5jZXItLWNvbnRyb2xzJyk7XG5cbi8vIGFwcC1sZXZlbCBmbGFnc1xudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG4vLyBTZXQgdXAgdGhlIGFwcC5cbi8vIFRoaXMgZGlkbid0IG5lZWQgdG8gYmUgd2l0aGluIGFuIElJRkU6IHBsYWluIG9sZCBpbXBlcmF0aXZlIGNvZGUgd291bGQgaGF2ZSB3b3JrZWQuXG4vLyBUaGUgd3JhcHBpbmcgaW4gYW4gSUlGRSBoaW50cyBhdCBob3cgdGhlIGNvZGUgY291bGQgYmUgbW9kdWxhcmlzZWQgbGF0ZXIuIFRoZSBzYW1lIGFwcGxpZXMgdG8gdGhlXG4vLyAgJ2NvbnRyb2xsZXInIGZ1bmN0aW9ucywgZnVydGhlciBkb3duIHRoZSBmaWxlLlxuKGZ1bmN0aW9uIGJvb3RzdHJhcCAoKSB7XG5cdHZhciBkZWZhdWx0U2VxdWVuY2UgPSBbXTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydsdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuXG5cdC8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxuXHR2YXIgZHJ1bVBhdGhzID0ge1xuXHRcdCdjbGFwJyAgOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsXG5cdFx0J2Nvd2JsJyA6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsXG5cdFx0J2h0bScgICA6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLFxuXHRcdCdsdG0nICAgOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJyxcblx0XHQnbXRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsXG5cdFx0J3JpbXNoJyA6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsXG5cdFx0J3RhbWJvJyA6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVidcblx0fTtcblxuXHQvLyBzZXQgdXAgdGhlIERydW0gb2JqZWN0cyBpbiB0aGUgZHJ1bSBjb2xsZWN0aW9uXG5cdGZvciggdmFyIGRydW0gaW4gZHJ1bVBhdGhzICkgeyBpZiggZHJ1bVBhdGhzLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0XHQvLyBsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcblx0XHRkcnVtT2JqZWN0c1sgZHJ1bSBdID0gbmV3IERydW0oIGRydW1QYXRoc1sgZHJ1bSBdLCBjb250ZXh0ICk7XG5cdH19XG5cblxuXHQvLyAnbG9hZCcgdGhlIGRlZmF1bHQgc2VxdWVuY2UgaW50byB0aGUgc2VxdWVuY2VyXG5cdGRlZmF1bHRTZXF1ZW5jZS5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXAsIGluZGV4ICkge1xuXHRcdHN0ZXAuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwRHJ1bSApIHtcblx0XHRcdHNlcXVlbmNlci5zZXRTdGVwKCBpbmRleCwgZHJ1bU9iamVjdHNbIHN0ZXBEcnVtIF0gKTtcblx0XHR9KTtcblx0fSk7XG5cbn0pKCk7XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSW50ZXJmYWNlIChldmVudCBoYW5kbGluZylcbi8vIC0gdGhpcyBjb3VsZCBwcm9iYWJseSBiZWNvbWUgYSBraW5kIG9mIG1hc3RlciBvYmplY3QsIG9yIGNvbnRyb2xsZXJcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLy8gZXZlbnQgaGFuZGxlcnNcbi8vXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0aWYoIHNlcXVlbmNlci5wbGF5aW5nICkgc2VxdWVuY2VyLnN0b3AoKTtcblx0XHRlbHNlIHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZVBhZEhpdCAoIGV2ZW50ICkge1xuXHRuaXgoIGV2ZW50ICk7XG5cdGRydW1PYmplY3RzWyBldmVudC50YXJnZXQuaWQgXS5iYW5nKCk7XG5cblx0aWYoIHByZXZpb3VzRHJ1bSAmJiBwcmV2aW91c0RydW0ubmFtZSAhPT0gZXZlbnQudGFyZ2V0LmlkICkge1xuXHRcdCRwYWRncmlkLmZpbmQoICcjJyArIHByZXZpb3VzRHJ1bS5uYW1lICkudG9nZ2xlQ2xhc3MoICdwcmV2aW91cycsIGZhbHNlICk7XG5cdH1cblx0cHJldmlvdXNEcnVtID0gZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdO1xuXHQkcGFkZ3JpZC5maW5kKCAnIycgKyBldmVudC50YXJnZXQuaWQgKS50b2dnbGVDbGFzcyggJ3ByZXZpb3VzJywgdHJ1ZSApO1xuXG5cdHNob3dEcnVtU3RlcHMoKTtcblxuXHRpZiggL21vdXNlLy50ZXN0KCBldmVudC50eXBlICkgKSB0b2dnbGVNb3VzZURvd25UcnVlKCk7XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlQ29udHJvbHMgKCBldmVudCApIHtcblx0bml4KCBldmVudCApO1xuXG5cdHN3aXRjaCggZXZlbnQudGFyZ2V0LmlkICkge1xuXHRjYXNlIFwicnduZFwiOlxuXHRcdGZsYXNoKCBldmVudC50YXJnZXQsICdvcmFuZ2UnICk7XG5cdFx0c2VxdWVuY2VyLmN1cnJlbnRTdGVwID0gMDtcblx0XHRicmVhaztcblx0Y2FzZSBcInBsYXlcIjpcblx0XHRpZihzZXF1ZW5jZXIucGxheWluZykgcmV0dXJuO1xuXHRcdGZsYXNoKCBldmVudC50YXJnZXQsICdncmVlbicgKTtcblx0XHRzZXF1ZW5jZXIuc3RhcnQoKTtcblx0XHRicmVhaztcblx0Y2FzZSBcInN0b3BcIjpcblx0XHRmbGFzaCggZXZlbnQudGFyZ2V0LCAncmVkJyApO1xuXHRcdHNlcXVlbmNlci5zdG9wKCk7XG5cdFx0YnJlYWs7XG5cdH1cbn1cblxuXG5cbmZ1bmN0aW9uIGhhbmRsZVN0ZXBUYXAgKCkge1xuXHR2YXIgc3RlcElkID0gcGFyc2VJbnQoIHRoaXMuaWQuc3Vic3RyKDQpLCAxMCApO1xuXHRuaXgoIGV2ZW50ICk7XG5cdGlmKCAhcHJldmlvdXNEcnVtICkgcmV0dXJuO1xuXHRmbGFzaCggdGhpcywgJ2RhcmtncmV5Jyk7XG5cdHNlcXVlbmNlci5zZXRTdGVwKCBzdGVwSWQsIHByZXZpb3VzRHJ1bSApO1xuXHRzaG93RHJ1bVN0ZXBzKCk7XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcCAoIGV2ZW50LCBzdGVwSWQgKSB7XG5cdHZhciBzdGVwQnV0dG9uID0gJHN0ZXBCdXR0b25zLmVxKCBzdGVwSWQgKTtcblx0Zmxhc2goIHN0ZXBCdXR0b24uZmluZCgnc3BhbicpLCAnb3JhbmdlJyApO1xuXHRpZiggc3RlcElkICUgNCA9PT0gMCApIGZsYXNoKCAkY29udHJvbHMuZmluZCgnI3BsYXknKSwgJ2dyZWVuJyApO1xufVxuXG5cblxuXG4vLyBoZWxwZXIgZnVuY3Rpb25zXG4vLyAodXN1YWxseSBjYWxsZWQgd2l0aGluIGEgaGFuZGxlciwgYnV0IHNvbWV0aW1lcyBjYWxsZWQgQVMgYSBoYW5kbGVyKVxuLy9cbmZ1bmN0aW9uIG5peCAoIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0ZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxuXG5mdW5jdGlvbiBmbGFzaCAoIGVsZW0sIGNvbG91ciApIHtcblx0dmFyICRlbGVtID0gJCggZWxlbSApO1xuXHR2YXIgZmxhc2hDbGFzcyA9ICdmbGFzaC0tJyArIGNvbG91cjtcblx0JGVsZW0uYWRkQ2xhc3MoIGZsYXNoQ2xhc3MgKTtcblx0JGVsZW0ub25lKCB0cmFuc2l0aW9uRW5kLCBmdW5jdGlvbiAoKSB7ICRlbGVtLnJlbW92ZUNsYXNzKCBmbGFzaENsYXNzICk7IH0pO1xufVxuXG5cbmZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duRmFsc2UgKCkgeyBtb3VzZWRvd24gPSBmYWxzZTsgfVxuXG5cbmZ1bmN0aW9uIHNob3dEcnVtU3RlcHMgKCkge1xuXHR2YXIgZHJ1bVN0ZXBzID0gc2VxdWVuY2VyLnNlcXVlbmNlLnJlZHVjZSggZmlsdGVyRm9yTGFzdERydW0sIFtdICk7XG5cblx0JHN0ZXBCdXR0b25zLmVhY2goIGZ1bmN0aW9uIHR1cm5PZmZMRUQgKCBpbmRleCwgYnV0dG9uICkge1xuXHRcdGlmKCBkcnVtU3RlcHNbMF0gPT09IGluZGV4ICkge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgdHJ1ZSApO1xuXHRcdFx0ZHJ1bVN0ZXBzLnNoaWZ0KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoYnV0dG9uKS5maW5kKCcubGVkJykudG9nZ2xlQ2xhc3MoJ2xlZC1vbicsIGZhbHNlICk7XG5cdFx0fVxuXHR9KTtcbn1cblxuLy8gY2FsbGJhY2sgZm9yIFtdLmZpbHRlciB3aGljaFxuZnVuY3Rpb24gZmlsdGVyRm9yTGFzdERydW0gKCBhY2N1bSwgY3VycmVudFN0ZXBEcnVtcywgaW5kZXggKSB7XG5cdC8vIGN1cnJlbnQgPT09IHN0ZXBEcnVtcyBpLmUuIGFuIGFycmF5IG9mIGRydW1zIGF0IHN0ZXBbIGluZGV4IF1cblx0aWYoIGN1cnJlbnRTdGVwRHJ1bXMuc29tZSggZmluZERydW0gKSApIGFjY3VtLnB1c2goIGluZGV4ICk7XG5cdHJldHVybiBhY2N1bTtcbn1cblxuLy8gY2FsbGJhY2sgZm9yIFtdLnNvbWUsIHJldHVybmluZyB0cnVlIGlmIHRoZSBwYXNzZWQtaW4gZHJ1bSBtYXRjaGVzIHByZXZpb3VzRHJ1bVxuZnVuY3Rpb24gZmluZERydW0gKCBpbnNwZWN0ZWQgKSB7XG5cdHJldHVybiBpbnNwZWN0ZWQubmFtZSA9PT0gcHJldmlvdXNEcnVtLm5hbWU7XG59XG5cblxuLy9cbi8vICdjb250cm9sbGVycydcbi8vXG5cbi8vIHNldHMgdXAgYmluZGluZ3MgYmV0d2VlbiB0aGUgJ2RydW0gcGFkJyBidXR0b25zIGFuZCB0aGUgZHJ1bXMgYW5kIHNlcXVlbmNlclxuKGZ1bmN0aW9uIHBhZENvbnRyb2xsZXIgKCkge1xuXHQvLyBFYWNoIHBhZCAnbGlzdGVucycgdG8gaXRzIGFzc29jaWF0ZWQgZHJ1bSBmb3IgJ2JhbmcnIGV2ZW50c1xuXHQvLyAgYW5kIGZsYXNoZXMgd2hlbiBpdCBoZWFycyBvbmUuXG5cdCRwYWRzLmVhY2goIGZ1bmN0aW9uIHNldERydW1FdmVudHMgKCBpbmRleCwgcGFkICl7XG5cdFx0dmFyICRwYWQgPSAkKHBhZCk7XG5cdFx0ZHJ1bU9iamVjdHNbIHBhZC5pZCBdLm9uKCAnYmFuZycsIGZ1bmN0aW9uIG9uQmFuZyAoIC8qZXZlbnQqLyApe1xuXHRcdFx0Zmxhc2goIHBhZCwgJ3JlZCcgKTtcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG5cdCRkb2N1bWVudC5vbignbW91c2Vkb3duJywgdG9nZ2xlTW91c2VEb3duVHJ1ZSApO1xuXHQkZG9jdW1lbnQub24oJ21vdXNldXAnLCB0b2dnbGVNb3VzZURvd25GYWxzZSApO1xuXG5cdC8vIGRlbGVnYXRlIGRydW0gcGFkIHRhcHMgdG8gcGFkZ3JpZFxuXHQkcGFkZ3JpZC5vbignbW91c2VlbnRlcicsICdidXR0b24nLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxuXHR9KTtcblx0JHBhZGdyaWQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xufSkoKTtcblxuXG4oZnVuY3Rpb24gc2VxdWVuY2VyQ29udHJvbGxlciAoKSB7XG5cdC8vIHNob3cgdGVtcG9cblx0JGNvbnRyb2xzLmZpbmQoJyN0ZW1wbycpLnRleHQoIHNlcXVlbmNlci50ZW1wbyApO1xuXG5cdC8vIERPTSBldmVudHNcblx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cdCRzdGVwbGluZS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlU3RlcFRhcCApO1xuXHQkY29udHJvbHMub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZUNvbnRyb2xzICk7XG5cblx0Ly8gaW50ZXJuYWwgZXZlbnRzXG5cdHNlcXVlbmNlci5vbiggJ3BsYXlTdGVwJywgaGFuZGxlU3RlcCApO1xufSkoKTtcblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=