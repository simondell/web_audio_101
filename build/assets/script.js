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

var drumObjects = {};
var sequencer = new Sequencer();
var context = new AudioContext();

var $document = $(document);
var $stepline = $('#stepline')
var $padgrid = $('#padgrid');


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


var mousedown = false;
function toggleMouseDownTrue () { mousedown = true; }
function toggleMouseDownFalse () { mousedown = false; }


var $pads;	// will be a $set of buttons for use as drum pads

(function padController () {
	$pads = $padgrid.find('button');

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

	sequencer.on('playStep', handleStep )
})();





}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG5cbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG52YXIgdHJhbnNpdGlvbkVuZCA9ICd3ZWJraXRUcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIG9UcmFuc2l0aW9uRW5kIG1zVHJhbnNpdGlvbkVuZCB0cmFuc2l0aW9uZW5kJztcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgYXJncyApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUsIGFyZ3MgKTsgcmV0dXJuIHRoaXM7IH1cbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBkcnVtIHNvdW5kcywgY2hhbm5lbCB0byBwbGF5IHRoZW0gdGhyb3VnaCwgbG9hZGVyIHRvIGxvYWQgdGhlbSBldGNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuXG4vKipcbiAqIEBjbGFzcyBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dmFyIGRydW0gPSB0aGlzO1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLm5hbWUgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaS5leGVjKCBwYXRoIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHQoZnVuY3Rpb24gbG9hZFNvdW5kKCkge1xuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdFx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdFx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdFx0ZHJ1bS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3NlcXVlbmNlcicgc2VjdGlvblxuLy8gRGF0YSBzdHJ1Y3R1cmVzIGZvciB0aGUgc2VxdWVuY2UsIGEgZGVmYXVsdCBzZXF1ZW5jZSwgZnVuY3Rpb25zIGZvciBwbGF5YmFja1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuZnVuY3Rpb24gU2VxdWVuY2VyICgpIHtcblx0dGhpcy5zZXF1ZW5jZSA9IFtdO1xuXHR0aGlzLnNlcU1heExlbiA9IDE2O1xuXHR0aGlzLmN1cnJlbnRTdGVwID0gMDtcblx0dGhpcy5uZXh0VGltZXIgPSBudWxsOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdHRoaXMudGVtcG8gPSAxMDc7XG5cdHRoaXMuZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblx0dmFyIGNvdW50ID0gdGhpcy5zZXFNYXhMZW47XG5cdHdoaWxlKCBjb3VudC0tICkgdGhpcy5zZXF1ZW5jZS5wdXNoKCBbXSApO1xufVxuXG5TZXF1ZW5jZXIucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcblNlcXVlbmNlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTZXF1ZW5jZXI7XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCAoKSB7XG5cdHRoaXMucGxheWluZyA9IHRydWU7XG5cdHRoaXMuaW50ZXJ2YWwgPSAoNjAgLyAodGhpcy50ZW1wbyAqIHRoaXMuZGl2aXNpb24pKSAqIDEwMDA7XG5cdHRoaXMucGxheVN0ZXAoKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0Y2xlYXJUaW1lb3V0KCB0aGlzLm5leHRUaW1lciApO1xufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5wbGF5U3RlcCA9IGZ1bmN0aW9uIHBsYXlTdGVwICgpIHtcblx0dmFyIHNlcXIgPSB0aGlzO1xuXHR2YXIgc3RlcERydW1zID0gdGhpcy5zZXF1ZW5jZVsgdGhpcy5jdXJyZW50U3RlcCBdO1xuXHR2YXIgZHJ1bUNvdW50ID0gc3RlcERydW1zLmxlbmd0aDtcblxuXHR0aGlzLnRyaWdnZXIoJ3BsYXlTdGVwJywgdGhpcy5jdXJyZW50U3RlcCApO1xuXG5cdHdoaWxlKCBkcnVtQ291bnQtLSApIHtcblx0XHRzdGVwRHJ1bXNbIGRydW1Db3VudCBdLmJhbmcoKTtcblx0fVxuXG5cdHRoaXMuY3VycmVudFN0ZXAgPSArK3RoaXMuY3VycmVudFN0ZXAgJSB0aGlzLnNlcU1heExlbjtcblxuXHRpZiggdGhpcy5wbGF5aW5nICkge1xuXHRcdHRoaXMubmV4dFRpbWVyID0gc2V0VGltZW91dCggJC5wcm94eSggc2Vxci5wbGF5U3RlcCwgc2VxciApLCBzZXFyLmludGVydmFsICk7XG5cdH1cbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc2V0U3RlcCA9IGZ1bmN0aW9uIHNldFN0ZXAgKCBzdGVwSWQsIGRydW0gKSB7XG5cdHZhciBzdGVwID0gdGhpcy5zZXF1ZW5jZVsgc3RlcElkIF07XG5cdHZhciBkcnVtUG9zaXRpb24gPSAkLmluQXJyYXkoIGRydW0sIHN0ZXAgKTtcblxuXHQvLyBpZiB0aGUgZHJ1bSBpcyBhbHJlYWR5IGluIHRoZSBzdGVwIGFycmF5LCByZW1vdmUgaXRcblx0aWYoIGRydW1Qb3NpdGlvbiA+IC0xICkge1x0c3RlcC5zcGxpY2UoIGRydW1Qb3NpdGlvbiwgMSApOyB9XG5cdC8vIG90aGVyd2lzZSwgYWRkIGl0XG5cdGVsc2UgaWYoIGRydW0gKSBzdGVwLnB1c2goIGRydW0gKTtcbn07XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gYm9vdHN0cmFwIC0gc3RhcnQgdGhlIGFwcFxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxudmFyIGRydW1PYmplY3RzID0ge307XG52YXIgc2VxdWVuY2VyID0gbmV3IFNlcXVlbmNlcigpO1xudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbnZhciAkZG9jdW1lbnQgPSAkKGRvY3VtZW50KTtcbnZhciAkc3RlcGxpbmUgPSAkKCcjc3RlcGxpbmUnKVxudmFyICRwYWRncmlkID0gJCgnI3BhZGdyaWQnKTtcblxuXG4oZnVuY3Rpb24gYm9vdHN0cmFwICgpIHtcblx0dmFyIGRlZmF1bHRTZXF1ZW5jZSA9IFtdO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCcsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ2x0bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5cblx0Ly8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG5cdHZhciBkcnVtUGF0aHMgPSB7XG5cdFx0J2NsYXAnICA6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJyxcblx0XHQnY293YmwnIDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJyxcblx0XHQnaHRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsXG5cdFx0J2x0bScgICA6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLFxuXHRcdCdtdG0nICAgOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJyxcblx0XHQncmltc2gnIDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJyxcblx0XHQndGFtYm8nIDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJ1xuXHR9O1xuXG5cdC8vIHNldCB1cCB0aGUgRHJ1bSBvYmplY3RzIGluIHRoZSBkcnVtIGNvbGxlY3Rpb25cblx0Zm9yKCB2YXIgZHJ1bSBpbiBkcnVtUGF0aHMgKSB7IGlmKCBkcnVtUGF0aHMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHRcdC8vIGxvYWRTb3VuZCggZHJ1bXNbZHJ1bV0ucGF0aCApO1xuXHRcdGRydW1PYmplY3RzWyBkcnVtIF0gPSBuZXcgRHJ1bSggZHJ1bVBhdGhzWyBkcnVtIF0sIGNvbnRleHQgKTtcblx0fX1cblxuXG5cdC8vICdsb2FkJyB0aGUgZGVmYXVsdCBzZXF1ZW5jZSBpbnRvIHRoZSBzZXF1ZW5jZXJcblx0ZGVmYXVsdFNlcXVlbmNlLmZvckVhY2goIGZ1bmN0aW9uICggc3RlcCwgaW5kZXggKSB7XG5cdFx0c3RlcC5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXBEcnVtICkge1xuXHRcdFx0c2VxdWVuY2VyLnNldFN0ZXAoIGluZGV4LCBkcnVtT2JqZWN0c1sgc3RlcERydW0gXSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSkoKTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuZnVuY3Rpb24gaGFuZGxlS2V5cyAoIGV2ZW50ICkge1xuXHRzd2l0Y2goIGV2ZW50LndoaWNoICkge1xuXHRjYXNlIDMyOlxuXHRcdGlmKCBzZXF1ZW5jZXIucGxheWluZyApIHNlcXVlbmNlci5zdG9wKCk7XG5cdFx0ZWxzZSBzZXF1ZW5jZXIuc3RhcnQoKTtcblx0XHRicmVhaztcbiBcdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXG5cdHRvZ2dsZU1vdXNlRG93blRydWUoKTtcblx0ZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdLmJhbmcoKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVN0ZXAgKCBldmVudCwgc3RlcElkICkge1xuXHR2YXIgc3RlcEJ1dHRvbiA9ICRzdGVwbGluZS5maW5kKCdidXR0b24nKS5lcSggc3RlcElkICk7XG5cdGZsYXNoKCBzdGVwQnV0dG9uLmZpbmQoJ3NwYW4nKSwgJ29yYW5nZScgKTtcbn1cblxuZnVuY3Rpb24gZmxhc2ggKCBlbGVtLCBjb2xvdXIgKSB7XG5cdHZhciAkZWxlbSA9ICQoIGVsZW0gKTtcblx0dmFyIGZsYXNoQ2xhc3MgPSAnZmxhc2gtLScgKyBjb2xvdXI7XG5cdCRlbGVtLmFkZENsYXNzKCBmbGFzaENsYXNzICk7XG5cdCRlbGVtLm9uZSggdHJhbnNpdGlvbkVuZCwgZnVuY3Rpb24gKCkgeyAkZWxlbS5yZW1vdmVDbGFzcyggZmxhc2hDbGFzcyApOyB9KTtcbn1cblxuXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25UcnVlICgpIHsgbW91c2Vkb3duID0gdHJ1ZTsgfVxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duRmFsc2UgKCkgeyBtb3VzZWRvd24gPSBmYWxzZTsgfVxuXG5cbnZhciAkcGFkcztcdC8vIHdpbGwgYmUgYSAkc2V0IG9mIGJ1dHRvbnMgZm9yIHVzZSBhcyBkcnVtIHBhZHNcblxuKGZ1bmN0aW9uIHBhZENvbnRyb2xsZXIgKCkge1xuXHQkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xuXG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5cdFx0XHRmbGFzaCggcGFkLCAncmVkJyApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyB0b2dnbGUgbW91c2Vkb3duIGZsYWcsIHVzZWQgZm9yIGRyYWdnaW5nIGFuICdhY3RpdmVcIiBtb3VzZSBvdmVyIG1hY2hpbmUgY29udHJvbHNcblx0JGRvY3VtZW50Lm9uKCdtb3VzZWRvd24nLCB0b2dnbGVNb3VzZURvd25UcnVlICk7XG5cdCRkb2N1bWVudC5vbignbW91c2V1cCcsIHRvZ2dsZU1vdXNlRG93bkZhbHNlICk7XG5cblx0Ly8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG5cdCRwYWRncmlkLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG5cdH0pO1xuXHQkcGFkZ3JpZC5vbignbW91c2Vkb3duJywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xuXHQkcGFkZ3JpZC5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbn0pKCk7XG5cbihmdW5jdGlvbiBzZXF1ZW5jZXJDb250cm9sbGVyICgpIHtcblx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cblx0c2VxdWVuY2VyLm9uKCdwbGF5U3RlcCcsIGhhbmRsZVN0ZXAgKVxufSkoKTtcblxuXG5cblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=