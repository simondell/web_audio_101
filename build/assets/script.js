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
// drum sounds, channel to play them through, loader to load them etc
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

// cached $(elements)
var $document = $(document);
var $stepline = $('#stepline');
var $padgrid = $('#padgrid');
var $pads = $padgrid.find('button');


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
	event.preventDefault();
	event.stopImmediatePropagation();

	toggleMouseDownTrue();
	drumObjects[ event.target.id ].bang();

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

function handleStep ( event, stepId ) {
	var stepButton = $stepline.find('button').eq( stepId );
	flash( stepButton.find('span'), 'orange' );
}

function flash ( elem, colour ) {
	var $elem = $( elem );
	var flashClass = 'flash--' + colour;
	$elem.addClass( flashClass );
	$elem.one( transitionEnd, function () { $elem.removeClass( flashClass ); });
}

function toggleMouseDownTrue () { mousedown = true; }

function toggleMouseDownFalse () { mousedown = false; }


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
	$padgrid.on('mousedown', 'button', handlePadHit );
	$padgrid.on('touchstart', 'button', handlePadHit );
})();

(function sequencerController () {
	$(document).on('keydown', handleKeys );

	sequencer.on('playStep', handleStep );
})();





}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG5cbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG52YXIgdHJhbnNpdGlvbkVuZCA9ICd3ZWJraXRUcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIG9UcmFuc2l0aW9uRW5kIG1zVHJhbnNpdGlvbkVuZCB0cmFuc2l0aW9uZW5kJztcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgYXJncyApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUsIGFyZ3MgKTsgcmV0dXJuIHRoaXM7IH1cbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBkcnVtIHNvdW5kcywgY2hhbm5lbCB0byBwbGF5IHRoZW0gdGhyb3VnaCwgbG9hZGVyIHRvIGxvYWQgdGhlbSBldGNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuXG4vKipcbiAqIEB0eXBlIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR2YXIgZHJ1bSA9IHRoaXM7XG5cdHRoaXMucGF0aCA9IHBhdGg7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdHRoaXMubmFtZSA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pLmV4ZWMoIHBhdGggKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdChmdW5jdGlvbiBsb2FkU291bmQoKSB7XG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0XHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRkcnVtLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH0pO1xuXG5cdFx0fTtcblxuXHRcdHJlcXVlc3Qub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cdFx0cmVxdWVzdC5zZW5kKCk7XG5cdH0pKCk7XG59XG5cbkRydW0ucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcbkRydW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHJ1bTtcblxuRHJ1bS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uIGJhbmcgKCkge1xuXHR2YXIgbm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0bm9kZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblx0bm9kZS5jb25uZWN0KCB0aGlzLmNvbnRleHQuZGVzdGluYXRpb24gKTtcblx0bm9kZS5zdGFydCggMCApO1xuXG5cdHRoaXMudHJpZ2dlcignYmFuZycpO1xufTtcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc2VxdWVuY2VyJyBzZWN0aW9uXG4vLyBEYXRhIHN0cnVjdHVyZXMgZm9yIHRoZSBzZXF1ZW5jZSwgYSBkZWZhdWx0IHNlcXVlbmNlLCBmdW5jdGlvbnMgZm9yIHBsYXliYWNrXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEB0eXBlIFNlcXVlbmNlclxuICogQGV4dGVuZHMgRXZlbnRlZFxuICogaGFuZGxlcyB0aGUgc2VxdWVuY2VcbiAqL1xuZnVuY3Rpb24gU2VxdWVuY2VyICgpIHtcblx0dGhpcy5zZXF1ZW5jZSA9IFtdO1xuXHR0aGlzLnNlcU1heExlbiA9IDE2O1xuXHR0aGlzLmN1cnJlbnRTdGVwID0gMDtcblx0dGhpcy5uZXh0VGltZXIgPSBudWxsOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdHRoaXMudGVtcG8gPSAxMDc7XG5cdHRoaXMuZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblx0dmFyIGNvdW50ID0gdGhpcy5zZXFNYXhMZW47XG5cdHdoaWxlKCBjb3VudC0tICkgdGhpcy5zZXF1ZW5jZS5wdXNoKCBbXSApO1xufVxuXG5TZXF1ZW5jZXIucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcblNlcXVlbmNlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTZXF1ZW5jZXI7XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCAoKSB7XG5cdHRoaXMucGxheWluZyA9IHRydWU7XG5cdHRoaXMuaW50ZXJ2YWwgPSAoNjAgLyAodGhpcy50ZW1wbyAqIHRoaXMuZGl2aXNpb24pKSAqIDEwMDA7XG5cdHRoaXMucGxheVN0ZXAoKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0Y2xlYXJUaW1lb3V0KCB0aGlzLm5leHRUaW1lciApO1xufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5wbGF5U3RlcCA9IGZ1bmN0aW9uIHBsYXlTdGVwICgpIHtcblx0dmFyIHNlcXIgPSB0aGlzO1xuXHR2YXIgc3RlcERydW1zID0gdGhpcy5zZXF1ZW5jZVsgdGhpcy5jdXJyZW50U3RlcCBdO1xuXHR2YXIgZHJ1bUNvdW50ID0gc3RlcERydW1zLmxlbmd0aDtcblxuXHR0aGlzLnRyaWdnZXIoJ3BsYXlTdGVwJywgdGhpcy5jdXJyZW50U3RlcCApO1xuXG5cdHdoaWxlKCBkcnVtQ291bnQtLSApIHtcblx0XHRzdGVwRHJ1bXNbIGRydW1Db3VudCBdLmJhbmcoKTtcblx0fVxuXG5cdHRoaXMuY3VycmVudFN0ZXAgPSArK3RoaXMuY3VycmVudFN0ZXAgJSB0aGlzLnNlcU1heExlbjtcblxuXHRpZiggdGhpcy5wbGF5aW5nICkge1xuXHRcdHRoaXMubmV4dFRpbWVyID0gc2V0VGltZW91dCggJC5wcm94eSggc2Vxci5wbGF5U3RlcCwgc2VxciApLCBzZXFyLmludGVydmFsICk7XG5cdH1cbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc2V0U3RlcCA9IGZ1bmN0aW9uIHNldFN0ZXAgKCBzdGVwSWQsIGRydW0gKSB7XG5cdHZhciBzdGVwID0gdGhpcy5zZXF1ZW5jZVsgc3RlcElkIF07XG5cdHZhciBkcnVtUG9zaXRpb24gPSAkLmluQXJyYXkoIGRydW0sIHN0ZXAgKTtcblxuXHQvLyBpZiB0aGUgZHJ1bSBpcyBhbHJlYWR5IGluIHRoZSBzdGVwIGFycmF5LCByZW1vdmUgaXRcblx0aWYoIGRydW1Qb3NpdGlvbiA+IC0xICkge1x0c3RlcC5zcGxpY2UoIGRydW1Qb3NpdGlvbiwgMSApOyB9XG5cdC8vIG90aGVyd2lzZSwgYWRkIGl0XG5cdGVsc2UgaWYoIGRydW0gKSBzdGVwLnB1c2goIGRydW0gKTtcbn07XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gYm9vdHN0cmFwIC0gc3RhcnQgdGhlIGFwcFxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLy8gYXBwLWxldmVsIG9iamVjdHMsIGNvbGxlY3Rpb25zIGV0Y1xudmFyIGRydW1PYmplY3RzID0ge307XG52YXIgc2VxdWVuY2VyID0gbmV3IFNlcXVlbmNlcigpO1xudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbi8vIGNhY2hlZCAkKGVsZW1lbnRzKVxudmFyICRkb2N1bWVudCA9ICQoZG9jdW1lbnQpO1xudmFyICRzdGVwbGluZSA9ICQoJyNzdGVwbGluZScpO1xudmFyICRwYWRncmlkID0gJCgnI3BhZGdyaWQnKTtcbnZhciAkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xuXG5cbi8vIGFwcC1sZXZlbCBmbGFnc1xudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG4vLyBTZXQgdXAgdGhlIGFwcC5cbi8vIFRoaXMgZGlkbid0IG5lZWQgdG8gYmUgd2l0aGluIGFuIElJRkU6IHBsYWluIG9sZCBpbXBlcmF0aXZlIGNvZGUgd291bGQgaGF2ZSB3b3JrZWQuXG4vLyBUaGUgd3JhcHBpbmcgaW4gYW4gSUlGRSBoaW50cyBhdCBob3cgdGhlIGNvZGUgY291bGQgYmUgbW9kdWxhcmlzZWQgbGF0ZXIuIFRoZSBzYW1lIGFwcGxpZXMgdG8gdGhlXG4vLyAgJ2NvbnRyb2xsZXInIGZ1bmN0aW9ucywgZnVydGhlciBkb3duIHRoZSBmaWxlLlxuKGZ1bmN0aW9uIGJvb3RzdHJhcCAoKSB7XG5cdHZhciBkZWZhdWx0U2VxdWVuY2UgPSBbXTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydsdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuXG5cdC8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxuXHR2YXIgZHJ1bVBhdGhzID0ge1xuXHRcdCdjbGFwJyAgOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsXG5cdFx0J2Nvd2JsJyA6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsXG5cdFx0J2h0bScgICA6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLFxuXHRcdCdsdG0nICAgOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJyxcblx0XHQnbXRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsXG5cdFx0J3JpbXNoJyA6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsXG5cdFx0J3RhbWJvJyA6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVidcblx0fTtcblxuXHQvLyBzZXQgdXAgdGhlIERydW0gb2JqZWN0cyBpbiB0aGUgZHJ1bSBjb2xsZWN0aW9uXG5cdGZvciggdmFyIGRydW0gaW4gZHJ1bVBhdGhzICkgeyBpZiggZHJ1bVBhdGhzLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0XHQvLyBsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcblx0XHRkcnVtT2JqZWN0c1sgZHJ1bSBdID0gbmV3IERydW0oIGRydW1QYXRoc1sgZHJ1bSBdLCBjb250ZXh0ICk7XG5cdH19XG5cblxuXHQvLyAnbG9hZCcgdGhlIGRlZmF1bHQgc2VxdWVuY2UgaW50byB0aGUgc2VxdWVuY2VyXG5cdGRlZmF1bHRTZXF1ZW5jZS5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXAsIGluZGV4ICkge1xuXHRcdHN0ZXAuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwRHJ1bSApIHtcblx0XHRcdHNlcXVlbmNlci5zZXRTdGVwKCBpbmRleCwgZHJ1bU9iamVjdHNbIHN0ZXBEcnVtIF0gKTtcblx0XHR9KTtcblx0fSk7XG5cbn0pKCk7XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSW50ZXJmYWNlIChldmVudCBoYW5kbGluZylcbi8vIC0gdGhpcyBjb3VsZCBwcm9iYWJseSBiZWNvbWUgYSBraW5kIG9mIG1hc3RlciBvYmplY3QsIG9yIGNvbnRyb2xsZXJcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLy8gZXZlbnQgaGFuZGxlcnNcbi8vXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0aWYoIHNlcXVlbmNlci5wbGF5aW5nICkgc2VxdWVuY2VyLnN0b3AoKTtcblx0XHRlbHNlIHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cblx0dG9nZ2xlTW91c2VEb3duVHJ1ZSgpO1xuXHRkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF0uYmFuZygpO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlU3RlcCAoIGV2ZW50LCBzdGVwSWQgKSB7XG5cdHZhciBzdGVwQnV0dG9uID0gJHN0ZXBsaW5lLmZpbmQoJ2J1dHRvbicpLmVxKCBzdGVwSWQgKTtcblx0Zmxhc2goIHN0ZXBCdXR0b24uZmluZCgnc3BhbicpLCAnb3JhbmdlJyApO1xufVxuXG5mdW5jdGlvbiBmbGFzaCAoIGVsZW0sIGNvbG91ciApIHtcblx0dmFyICRlbGVtID0gJCggZWxlbSApO1xuXHR2YXIgZmxhc2hDbGFzcyA9ICdmbGFzaC0tJyArIGNvbG91cjtcblx0JGVsZW0uYWRkQ2xhc3MoIGZsYXNoQ2xhc3MgKTtcblx0JGVsZW0ub25lKCB0cmFuc2l0aW9uRW5kLCBmdW5jdGlvbiAoKSB7ICRlbGVtLnJlbW92ZUNsYXNzKCBmbGFzaENsYXNzICk7IH0pO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25UcnVlICgpIHsgbW91c2Vkb3duID0gdHJ1ZTsgfVxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuLy9cbi8vICdjb250cm9sbGVycydcbi8vXG5cbi8vIHNldHMgdXAgYmluZGluZ3MgYmV0d2VlbiB0aGUgJ2RydW0gcGFkJyBidXR0b25zIGFuZCB0aGUgZHJ1bXMgYW5kIHNlcXVlbmNlclxuKGZ1bmN0aW9uIHBhZENvbnRyb2xsZXIgKCkge1xuXHQvLyBFYWNoIHBhZCAnbGlzdGVucycgdG8gaXRzIGFzc29jaWF0ZWQgZHJ1bSBmb3IgJ2JhbmcnIGV2ZW50c1xuXHQvLyAgYW5kIGZsYXNoZXMgd2hlbiBpdCBoZWFycyBvbmUuXG5cdCRwYWRzLmVhY2goIGZ1bmN0aW9uIHNldERydW1FdmVudHMgKCBpbmRleCwgcGFkICl7XG5cdFx0dmFyICRwYWQgPSAkKHBhZCk7XG5cdFx0ZHJ1bU9iamVjdHNbIHBhZC5pZCBdLm9uKCAnYmFuZycsIGZ1bmN0aW9uIG9uQmFuZyAoIC8qZXZlbnQqLyApe1xuXHRcdFx0Zmxhc2goIHBhZCwgJ3JlZCcgKTtcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG5cdCRkb2N1bWVudC5vbignbW91c2Vkb3duJywgdG9nZ2xlTW91c2VEb3duVHJ1ZSApO1xuXHQkZG9jdW1lbnQub24oJ21vdXNldXAnLCB0b2dnbGVNb3VzZURvd25GYWxzZSApO1xuXG5cdC8vIGRlbGVnYXRlIGRydW0gcGFkIHRhcHMgdG8gcGFkZ3JpZFxuXHQkcGFkZ3JpZC5vbignbW91c2VlbnRlcicsICdidXR0b24nLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxuXHR9KTtcblx0JHBhZGdyaWQub24oJ21vdXNlZG93bicsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcblx0JHBhZGdyaWQub24oJ3RvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG59KSgpO1xuXG4oZnVuY3Rpb24gc2VxdWVuY2VyQ29udHJvbGxlciAoKSB7XG5cdCQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgaGFuZGxlS2V5cyApO1xuXG5cdHNlcXVlbmNlci5vbigncGxheVN0ZXAnLCBoYW5kbGVTdGVwICk7XG59KSgpO1xuXG5cblxuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==