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

	if( !previousDrum || previousDrum.name !== event.target.id ) {
		previousDrum = drumObjects[ event.target.id ];
	}

	showDrumSteps();

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) {
		toggleMouseDownTrue();
	}

}


function handleStep ( event, stepId ) {
	var stepButton = $stepButtons.eq( stepId );
	flash( stepButton.find('span'), 'orange' );
}


function handleStepTap () {
	var stepId = parseInt( this.id.substr(4), 10 );
	nix( event );
	if( !previousDrum ) return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG5cbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG52YXIgdHJhbnNpdGlvbkVuZCA9ICd3ZWJraXRUcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIG9UcmFuc2l0aW9uRW5kIG1zVHJhbnNpdGlvbkVuZCB0cmFuc2l0aW9uZW5kJztcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgYXJncyApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUsIGFyZ3MgKTsgcmV0dXJuIHRoaXM7IH1cbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBEcnVtIHNvdW5kc1xuLy8gKFRoZSBsb2FkZXIgaXMgbm93IHBhcnQgb2YgdGhlIERydW0gb2JqZWN0LCBhbmQgdGhlIGNvbnRleHQvY2hhbm5lbCB0byBwbGF5XG4vLyAgdGhyb3VnaCBpcyBkZWZpbmVkIGJlbG93IGluIHRoZSAnYm9vdHN0cmFwJyBzZWN0aW9uIGJlY2F1c2UgdGhhdCBzdHVmZiBpcyBtb3JlXG4vLyAgbGlrZSBhcHAgY29kZSBvciBhIG1haW4oKS4gT3RoZXIgc291bmQgbWFuaXB1bGF0aW9uIGNvZGUgbWF5IGFwcGVhciBoZXJlIGxhdGVyKVxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG4vKipcbiAqIEB0eXBlIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR2YXIgZHJ1bSA9IHRoaXM7XG5cdHRoaXMucGF0aCA9IHBhdGg7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdHRoaXMubmFtZSA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pLmV4ZWMoIHBhdGggKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdChmdW5jdGlvbiBsb2FkU291bmQoKSB7XG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0XHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRkcnVtLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH0pO1xuXG5cdFx0fTtcblxuXHRcdHJlcXVlc3Qub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cdFx0cmVxdWVzdC5zZW5kKCk7XG5cdH0pKCk7XG59XG5cbkRydW0ucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcbkRydW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHJ1bTtcblxuRHJ1bS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uIGJhbmcgKCkge1xuXHR2YXIgbm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0bm9kZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblx0bm9kZS5jb25uZWN0KCB0aGlzLmNvbnRleHQuZGVzdGluYXRpb24gKTtcblx0bm9kZS5zdGFydCggMCApO1xuXG5cdHRoaXMudHJpZ2dlcignYmFuZycpO1xufTtcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc2VxdWVuY2VyJyBzZWN0aW9uXG4vLyBEYXRhIHN0cnVjdHVyZXMgZm9yIHRoZSBzZXF1ZW5jZSwgYSBkZWZhdWx0IHNlcXVlbmNlLCBmdW5jdGlvbnMgZm9yIHBsYXliYWNrXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEB0eXBlIFNlcXVlbmNlclxuICogQGV4dGVuZHMgRXZlbnRlZFxuICogaGFuZGxlcyB0aGUgc2VxdWVuY2VcbiAqL1xuZnVuY3Rpb24gU2VxdWVuY2VyICgpIHtcblx0dGhpcy5zZXF1ZW5jZSA9IFtdO1xuXHR0aGlzLnNlcU1heExlbiA9IDE2O1xuXHR0aGlzLmN1cnJlbnRTdGVwID0gMDtcblx0dGhpcy5uZXh0VGltZXIgPSBudWxsOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdHRoaXMudGVtcG8gPSAxMDc7XG5cdHRoaXMuZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblx0dmFyIGNvdW50ID0gdGhpcy5zZXFNYXhMZW47XG5cdHdoaWxlKCBjb3VudC0tICkgdGhpcy5zZXF1ZW5jZS5wdXNoKCBbXSApO1xufVxuXG5TZXF1ZW5jZXIucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcblNlcXVlbmNlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTZXF1ZW5jZXI7XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCAoKSB7XG5cdHRoaXMucGxheWluZyA9IHRydWU7XG5cdHRoaXMuaW50ZXJ2YWwgPSAoNjAgLyAodGhpcy50ZW1wbyAqIHRoaXMuZGl2aXNpb24pKSAqIDEwMDA7XG5cdHRoaXMucGxheVN0ZXAoKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0Y2xlYXJUaW1lb3V0KCB0aGlzLm5leHRUaW1lciApO1xufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5wbGF5U3RlcCA9IGZ1bmN0aW9uIHBsYXlTdGVwICgpIHtcblx0dmFyIHNlcXIgPSB0aGlzO1xuXHR2YXIgc3RlcERydW1zID0gdGhpcy5zZXF1ZW5jZVsgdGhpcy5jdXJyZW50U3RlcCBdO1xuXHR2YXIgZHJ1bUNvdW50ID0gc3RlcERydW1zLmxlbmd0aDtcblxuXHR0aGlzLnRyaWdnZXIoJ3BsYXlTdGVwJywgdGhpcy5jdXJyZW50U3RlcCApO1xuXG5cdHdoaWxlKCBkcnVtQ291bnQtLSApIHtcblx0XHRzdGVwRHJ1bXNbIGRydW1Db3VudCBdLmJhbmcoKTtcblx0fVxuXG5cdHRoaXMuY3VycmVudFN0ZXAgPSArK3RoaXMuY3VycmVudFN0ZXAgJSB0aGlzLnNlcU1heExlbjtcblxuXHRpZiggdGhpcy5wbGF5aW5nICkge1xuXHRcdHRoaXMubmV4dFRpbWVyID0gc2V0VGltZW91dCggJC5wcm94eSggc2Vxci5wbGF5U3RlcCwgc2VxciApLCBzZXFyLmludGVydmFsICk7XG5cdH1cbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc2V0U3RlcCA9IGZ1bmN0aW9uIHNldFN0ZXAgKCBzdGVwSWQsIGRydW0gKSB7XG5cdHZhciBzdGVwID0gdGhpcy5zZXF1ZW5jZVsgc3RlcElkIF07XG5cdHZhciBkcnVtUG9zaXRpb24gPSAkLmluQXJyYXkoIGRydW0sIHN0ZXAgKTtcblxuXHQvLyBpZiB0aGUgZHJ1bSBpcyBhbHJlYWR5IGluIHRoZSBzdGVwIGFycmF5LCByZW1vdmUgaXRcblx0aWYoIGRydW1Qb3NpdGlvbiA+IC0xICkge1x0c3RlcC5zcGxpY2UoIGRydW1Qb3NpdGlvbiwgMSApOyB9XG5cdC8vIG90aGVyd2lzZSwgYWRkIGl0XG5cdGVsc2UgaWYoIGRydW0gKSBzdGVwLnB1c2goIGRydW0gKTtcbn07XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gYm9vdHN0cmFwIC0gc3RhcnQgdGhlIGFwcFxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLy8gYXBwLWxldmVsIG9iamVjdHMsIGNvbGxlY3Rpb25zIGV0Y1xudmFyIGRydW1PYmplY3RzID0ge307XG52YXIgc2VxdWVuY2VyID0gbmV3IFNlcXVlbmNlcigpO1xudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG52YXIgcHJldmlvdXNEcnVtID0gbnVsbDtcblxuLy8gY2FjaGVkICQoZWxlbWVudHMpXG52YXIgJGRvY3VtZW50ID0gJChkb2N1bWVudCk7XG52YXIgJHBhZGdyaWQgPSAkKCcjcGFkZ3JpZCcpO1xudmFyICRwYWRzID0gJHBhZGdyaWQuZmluZCgnYnV0dG9uJyk7XG52YXIgJHN0ZXBsaW5lID0gJCgnI3N0ZXBsaW5lJyk7XG52YXIgJHN0ZXBCdXR0b25zID0gJHN0ZXBsaW5lLmZpbmQoJ2J1dHRvbicpO1xuXG4vLyBhcHAtbGV2ZWwgZmxhZ3NcbnZhciBtb3VzZWRvd24gPSBmYWxzZTtcblxuLy8gU2V0IHVwIHRoZSBhcHAuXG4vLyBUaGlzIGRpZG4ndCBuZWVkIHRvIGJlIHdpdGhpbiBhbiBJSUZFOiBwbGFpbiBvbGQgaW1wZXJhdGl2ZSBjb2RlIHdvdWxkIGhhdmUgd29ya2VkLlxuLy8gVGhlIHdyYXBwaW5nIGluIGFuIElJRkUgaGludHMgYXQgaG93IHRoZSBjb2RlIGNvdWxkIGJlIG1vZHVsYXJpc2VkIGxhdGVyLiBUaGUgc2FtZSBhcHBsaWVzIHRvIHRoZVxuLy8gICdjb250cm9sbGVyJyBmdW5jdGlvbnMsIGZ1cnRoZXIgZG93biB0aGUgZmlsZS5cbihmdW5jdGlvbiBib290c3RyYXAgKCkge1xuXHR2YXIgZGVmYXVsdFNlcXVlbmNlID0gW107XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJywgJ2Nvd2JsJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJywgJ2Nvd2JsJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsnbHRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsncmltc2gnXSk7XG5cblxuXHQvLyBsaXN0IHNvdW5kcywgdGhlbiBsb2FkIGFuZCBwbGF5IHRoZW1cblx0dmFyIGRydW1QYXRocyA9IHtcblx0XHQnY2xhcCcgIDogJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLFxuXHRcdCdjb3dibCcgOiAnYXNzZXRzLzcwNy83MDdDT1dCTC5XQVYnLFxuXHRcdCdodG0nICAgOiAnYXNzZXRzLzcwNy83MDdIVE0uV0FWJyxcblx0XHQnbHRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3TFRNLldBVicsXG5cdFx0J210bScgICA6ICdhc3NldHMvNzA3LzcwN01UTS5XQVYnLFxuXHRcdCdyaW1zaCcgOiAnYXNzZXRzLzcwNy83MDdSSU1TSC5XQVYnLFxuXHRcdCd0YW1ibycgOiAnYXNzZXRzLzcwNy83MDdUQU1CTy5XQVYnXG5cdH07XG5cblx0Ly8gc2V0IHVwIHRoZSBEcnVtIG9iamVjdHMgaW4gdGhlIGRydW0gY29sbGVjdGlvblxuXHRmb3IoIHZhciBkcnVtIGluIGRydW1QYXRocyApIHsgaWYoIGRydW1QYXRocy5oYXNPd25Qcm9wZXJ0eSggZHJ1bSApICl7XG5cdFx0Ly8gbG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG5cdFx0ZHJ1bU9iamVjdHNbIGRydW0gXSA9IG5ldyBEcnVtKCBkcnVtUGF0aHNbIGRydW0gXSwgY29udGV4dCApO1xuXHR9fVxuXG5cblx0Ly8gJ2xvYWQnIHRoZSBkZWZhdWx0IHNlcXVlbmNlIGludG8gdGhlIHNlcXVlbmNlclxuXHRkZWZhdWx0U2VxdWVuY2UuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwLCBpbmRleCApIHtcblx0XHRzdGVwLmZvckVhY2goIGZ1bmN0aW9uICggc3RlcERydW0gKSB7XG5cdFx0XHRzZXF1ZW5jZXIuc2V0U3RlcCggaW5kZXgsIGRydW1PYmplY3RzWyBzdGVwRHJ1bSBdICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59KSgpO1xuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cbi8vIGV2ZW50IGhhbmRsZXJzXG4vL1xuZnVuY3Rpb24gaGFuZGxlS2V5cyAoIGV2ZW50ICkge1xuXHRzd2l0Y2goIGV2ZW50LndoaWNoICkge1xuXHRjYXNlIDMyOlxuXHRcdGlmKCBzZXF1ZW5jZXIucGxheWluZyApIHNlcXVlbmNlci5zdG9wKCk7XG5cdFx0ZWxzZSBzZXF1ZW5jZXIuc3RhcnQoKTtcblx0XHRicmVhaztcbiBcdH1cbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0bml4KCBldmVudCApO1xuXHRkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF0uYmFuZygpO1xuXG5cdGlmKCAhcHJldmlvdXNEcnVtIHx8IHByZXZpb3VzRHJ1bS5uYW1lICE9PSBldmVudC50YXJnZXQuaWQgKSB7XG5cdFx0cHJldmlvdXNEcnVtID0gZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdO1xuXHR9XG5cblx0c2hvd0RydW1TdGVwcygpO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkge1xuXHRcdHRvZ2dsZU1vdXNlRG93blRydWUoKTtcblx0fVxuXG59XG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcCAoIGV2ZW50LCBzdGVwSWQgKSB7XG5cdHZhciBzdGVwQnV0dG9uID0gJHN0ZXBCdXR0b25zLmVxKCBzdGVwSWQgKTtcblx0Zmxhc2goIHN0ZXBCdXR0b24uZmluZCgnc3BhbicpLCAnb3JhbmdlJyApO1xufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZVN0ZXBUYXAgKCkge1xuXHR2YXIgc3RlcElkID0gcGFyc2VJbnQoIHRoaXMuaWQuc3Vic3RyKDQpLCAxMCApO1xuXHRuaXgoIGV2ZW50ICk7XG5cdGlmKCAhcHJldmlvdXNEcnVtICkgcmV0dXJuO1xuXHRzZXF1ZW5jZXIuc2V0U3RlcCggc3RlcElkLCBwcmV2aW91c0RydW0gKTtcblx0c2hvd0RydW1TdGVwcygpO1xufVxuXG5cbi8vIGhlbHBlciBmdW5jdGlvbnNcbi8vICh1c3VhbGx5IGNhbGxlZCB3aXRoaW4gYSBoYW5kbGVyLCBidXQgc29tZXRpbWVzIGNhbGxlZCBBUyBhIGhhbmRsZXIpXG4vL1xuZnVuY3Rpb24gbml4ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cbmZ1bmN0aW9uIGZsYXNoICggZWxlbSwgY29sb3VyICkge1xuXHR2YXIgJGVsZW0gPSAkKCBlbGVtICk7XG5cdHZhciBmbGFzaENsYXNzID0gJ2ZsYXNoLS0nICsgY29sb3VyO1xuXHQkZWxlbS5hZGRDbGFzcyggZmxhc2hDbGFzcyApO1xuXHQkZWxlbS5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJGVsZW0ucmVtb3ZlQ2xhc3MoIGZsYXNoQ2xhc3MgKTsgfSk7XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cblxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuZnVuY3Rpb24gc2hvd0RydW1TdGVwcyAoKSB7XG5cdHZhciBkcnVtU3RlcHMgPSBzZXF1ZW5jZXIuc2VxdWVuY2UucmVkdWNlKCBmaWx0ZXJGb3JMYXN0RHJ1bSwgW10gKTtcblxuXHQkc3RlcEJ1dHRvbnMuZWFjaCggZnVuY3Rpb24gdHVybk9mZkxFRCAoIGluZGV4LCBidXR0b24gKSB7XG5cdFx0aWYoIGRydW1TdGVwc1swXSA9PT0gaW5kZXggKSB7XG5cdFx0XHQkKGJ1dHRvbikuZmluZCgnLmxlZCcpLnRvZ2dsZUNsYXNzKCdsZWQtb24nLCB0cnVlICk7XG5cdFx0XHRkcnVtU3RlcHMuc2hpZnQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgZmFsc2UgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uZmlsdGVyIHdoaWNoXG5mdW5jdGlvbiBmaWx0ZXJGb3JMYXN0RHJ1bSAoIGFjY3VtLCBjdXJyZW50U3RlcERydW1zLCBpbmRleCApIHtcblx0Ly8gY3VycmVudCA9PT0gc3RlcERydW1zIGkuZS4gYW4gYXJyYXkgb2YgZHJ1bXMgYXQgc3RlcFsgaW5kZXggXVxuXHRpZiggY3VycmVudFN0ZXBEcnVtcy5zb21lKCBmaW5kRHJ1bSApICkgYWNjdW0ucHVzaCggaW5kZXggKTtcblx0cmV0dXJuIGFjY3VtO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uc29tZSwgcmV0dXJuaW5nIHRydWUgaWYgdGhlIHBhc3NlZC1pbiBkcnVtIG1hdGNoZXMgcHJldmlvdXNEcnVtXG5mdW5jdGlvbiBmaW5kRHJ1bSAoIGluc3BlY3RlZCApIHtcblx0cmV0dXJuIGluc3BlY3RlZC5uYW1lID09PSBwcmV2aW91c0RydW0ubmFtZTtcbn1cblxuXG4vL1xuLy8gJ2NvbnRyb2xsZXJzJ1xuLy9cblxuLy8gc2V0cyB1cCBiaW5kaW5ncyBiZXR3ZWVuIHRoZSAnZHJ1bSBwYWQnIGJ1dHRvbnMgYW5kIHRoZSBkcnVtcyBhbmQgc2VxdWVuY2VyXG4oZnVuY3Rpb24gcGFkQ29udHJvbGxlciAoKSB7XG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5cdFx0XHRmbGFzaCggcGFkLCAncmVkJyApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyB0b2dnbGUgbW91c2Vkb3duIGZsYWcsIHVzZWQgZm9yIGRyYWdnaW5nIGFuICdhY3RpdmVcIiBtb3VzZSBvdmVyIG1hY2hpbmUgY29udHJvbHNcblx0JGRvY3VtZW50Lm9uKCdtb3VzZWRvd24nLCB0b2dnbGVNb3VzZURvd25UcnVlICk7XG5cdCRkb2N1bWVudC5vbignbW91c2V1cCcsIHRvZ2dsZU1vdXNlRG93bkZhbHNlICk7XG5cblx0Ly8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG5cdCRwYWRncmlkLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG5cdH0pO1xuXHQkcGFkZ3JpZC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG59KSgpO1xuXG5cbihmdW5jdGlvbiBzZXF1ZW5jZXJDb250cm9sbGVyICgpIHtcblx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cdCRzdGVwbGluZS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlU3RlcFRhcCApO1xuXG5cdHNlcXVlbmNlci5vbigncGxheVN0ZXAnLCBoYW5kbGVTdGVwICk7XG59KSgpO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==