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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdlYiBBdWRpbyAxMDFcblxuKGZ1bmN0aW9uICh3aW5kb3csICQpe1xuXG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbnZhciB0cmFuc2l0aW9uRW5kID0gJ3dlYmtpdFRyYW5zaXRpb25FbmQgb3RyYW5zaXRpb25lbmQgb1RyYW5zaXRpb25FbmQgbXNUcmFuc2l0aW9uRW5kIHRyYW5zaXRpb25lbmQnO1xuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSGVscGVyIG9iamVjdHNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qKlxuICogRXZlbnRlZFxuICogYWRkcyBldmVudCBoYW5kbGluZyB0byBvYmplY3RzLCBkZWxlZ2F0aW5nIHRvICRcbiAqL1xuZnVuY3Rpb24gRXZlbnRlZCAoKSB7fVxuRXZlbnRlZC5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBFdmVudGVkLFxuXHRvbjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9uKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHRvZmY6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vZmYoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdHRyaWdnZXI6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBhcmdzICkgeyAkKHRoaXMpLnRyaWdnZXIoIGV2ZW50TmFtZSwgYXJncyApOyByZXR1cm4gdGhpczsgfVxufTtcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc3ludGgnIHNlY3Rpb25cbi8vIERydW0gc291bmRzXG4vLyAoVGhlIGxvYWRlciBpcyBub3cgcGFydCBvZiB0aGUgRHJ1bSBvYmplY3QsIGFuZCB0aGUgY29udGV4dC9jaGFubmVsIHRvIHBsYXlcbi8vICB0aHJvdWdoIGlzIGRlZmluZWQgYmVsb3cgaW4gdGhlICdib290c3RyYXAnIHNlY3Rpb24gYmVjYXVzZSB0aGF0IHN0dWZmIGlzIG1vcmVcbi8vICBsaWtlIGFwcCBjb2RlIG9yIGEgbWFpbigpLiBPdGhlciBzb3VuZCBtYW5pcHVsYXRpb24gY29kZSBtYXkgYXBwZWFyIGhlcmUgbGF0ZXIpXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cbi8qKlxuICogQHR5cGUgRHJ1bVxuICogQGV4dGVuZHMgRXZlbnRlZFxuICogaGFuZGxlcyBsb2FkaW5nICYgZGVjb2Rpbmcgc2FtcGxlcywgYW5kIGF0dGFjaGluZyB0byB0aGUgYXVkaW8gZ3JhcGhcbiAqL1xuZnVuY3Rpb24gRHJ1bSAoIHBhdGgsIGNvbnRleHQgKSB7XG5cdHZhciBkcnVtID0gdGhpcztcblx0dGhpcy5wYXRoID0gcGF0aDtcblx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcblx0dGhpcy5uYW1lID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2kuZXhlYyggcGF0aCApWzFdLnRvTG93ZXJDYXNlKCk7XG5cblx0KGZ1bmN0aW9uIGxvYWRTb3VuZCgpIHtcblx0XHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHRcdC8vIERlY29kZSBhc3luY2hyb25vdXNseVxuXHRcdHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gaGFuZGxlTG9hZFNvdW5kICggZXZlbnQgKSB7XG5cdFx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdFx0dmFyIHhociA9IGV2ZW50LnRhcmdldDtcblxuXHRcdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRcdGRydW0uYnVmZmVyID0gYnVmZmVyO1xuXHRcdFx0fSk7XG5cblx0XHR9O1xuXG5cdFx0cmVxdWVzdC5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblx0XHRyZXF1ZXN0LnNlbmQoKTtcblx0fSkoKTtcbn1cblxuRHJ1bS5wcm90b3R5cGUgPSBuZXcgRXZlbnRlZCgpO1xuRHJ1bS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEcnVtO1xuXG5EcnVtLnByb3RvdHlwZS5iYW5nID0gZnVuY3Rpb24gYmFuZyAoKSB7XG5cdHZhciBub2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXHRub2RlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuXHRub2RlLmNvbm5lY3QoIHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbiApO1xuXHRub2RlLnN0YXJ0KCAwICk7XG5cblx0dGhpcy50cmlnZ2VyKCdiYW5nJyk7XG59O1xuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzZXF1ZW5jZXInIHNlY3Rpb25cbi8vIERhdGEgc3RydWN0dXJlcyBmb3IgdGhlIHNlcXVlbmNlLCBhIGRlZmF1bHQgc2VxdWVuY2UsIGZ1bmN0aW9ucyBmb3IgcGxheWJhY2tcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qKlxuICogQHR5cGUgU2VxdWVuY2VyXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIHRoZSBzZXF1ZW5jZVxuICovXG5mdW5jdGlvbiBTZXF1ZW5jZXIgKCkge1xuXHR0aGlzLnNlcXVlbmNlID0gW107XG5cdHRoaXMuc2VxTWF4TGVuID0gMTY7XG5cdHRoaXMuY3VycmVudFN0ZXAgPSAwO1xuXHR0aGlzLm5leHRUaW1lciA9IG51bGw7IFx0Ly8gd2lsbCBob2xkIHRoZSB0aW1lb3V0IGlkIGZvciB0aGUgbmV4dCBzdGVwLCBzbyB0aGUgc2VxdWVuY2VyIGNhbiBiZSBzdG9wcGVkLlxuXHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0dGhpcy50ZW1wbyA9IDEwNztcblx0dGhpcy5kaXZpc2lvbiA9IDQ7XHQvLyBhcyBpbiA0IDEvMTZ0aC1ub3RlcyBwZXIgYmVhdC5cblxuXHR2YXIgY291bnQgPSB0aGlzLnNlcU1heExlbjtcblx0d2hpbGUoIGNvdW50LS0gKSB0aGlzLnNlcXVlbmNlLnB1c2goIFtdICk7XG59XG5cblNlcXVlbmNlci5wcm90b3R5cGUgPSBuZXcgRXZlbnRlZCgpO1xuU2VxdWVuY2VyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNlcXVlbmNlcjtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIHN0YXJ0ICgpIHtcblx0dGhpcy5wbGF5aW5nID0gdHJ1ZTtcblx0dGhpcy5pbnRlcnZhbCA9ICg2MCAvICh0aGlzLnRlbXBvICogdGhpcy5kaXZpc2lvbikpICogMTAwMDtcblx0dGhpcy5wbGF5U3RlcCgpO1xufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gc3RvcCAoKSB7XG5cdHRoaXMucGxheWluZyA9IGZhbHNlO1xuXHRjbGVhclRpbWVvdXQoIHRoaXMubmV4dFRpbWVyICk7XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnBsYXlTdGVwID0gZnVuY3Rpb24gcGxheVN0ZXAgKCkge1xuXHR2YXIgc2VxciA9IHRoaXM7XG5cdHZhciBzdGVwRHJ1bXMgPSB0aGlzLnNlcXVlbmNlWyB0aGlzLmN1cnJlbnRTdGVwIF07XG5cdHZhciBkcnVtQ291bnQgPSBzdGVwRHJ1bXMubGVuZ3RoO1xuXG5cdHRoaXMudHJpZ2dlcigncGxheVN0ZXAnLCB0aGlzLmN1cnJlbnRTdGVwICk7XG5cblx0d2hpbGUoIGRydW1Db3VudC0tICkge1xuXHRcdHN0ZXBEcnVtc1sgZHJ1bUNvdW50IF0uYmFuZygpO1xuXHR9XG5cblx0dGhpcy5jdXJyZW50U3RlcCA9ICsrdGhpcy5jdXJyZW50U3RlcCAlIHRoaXMuc2VxTWF4TGVuO1xuXG5cdGlmKCB0aGlzLnBsYXlpbmcgKSB7XG5cdFx0dGhpcy5uZXh0VGltZXIgPSBzZXRUaW1lb3V0KCAkLnByb3h5KCBzZXFyLnBsYXlTdGVwLCBzZXFyICksIHNlcXIuaW50ZXJ2YWwgKTtcblx0fVxufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5zZXRTdGVwID0gZnVuY3Rpb24gc2V0U3RlcCAoIHN0ZXBJZCwgZHJ1bSApIHtcblx0dmFyIHN0ZXAgPSB0aGlzLnNlcXVlbmNlWyBzdGVwSWQgXTtcblx0dmFyIGRydW1Qb3NpdGlvbiA9ICQuaW5BcnJheSggZHJ1bSwgc3RlcCApO1xuXG5cdC8vIGlmIHRoZSBkcnVtIGlzIGFscmVhZHkgaW4gdGhlIHN0ZXAgYXJyYXksIHJlbW92ZSBpdFxuXHRpZiggZHJ1bVBvc2l0aW9uID4gLTEgKSB7XHRzdGVwLnNwbGljZSggZHJ1bVBvc2l0aW9uLCAxICk7IH1cblx0Ly8gb3RoZXJ3aXNlLCBhZGQgaXRcblx0ZWxzZSBpZiggZHJ1bSApIHN0ZXAucHVzaCggZHJ1bSApO1xufTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBib290c3RyYXAgLSBzdGFydCB0aGUgYXBwXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vLyBhcHAtbGV2ZWwgb2JqZWN0cywgY29sbGVjdGlvbnMgZXRjXG52YXIgZHJ1bU9iamVjdHMgPSB7fTtcbnZhciBzZXF1ZW5jZXIgPSBuZXcgU2VxdWVuY2VyKCk7XG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciBwcmV2aW91c0RydW0gPSBudWxsO1xuXG4vLyBjYWNoZWQgJChlbGVtZW50cylcbnZhciAkZG9jdW1lbnQgPSAkKGRvY3VtZW50KTtcbnZhciAkcGFkZ3JpZCA9ICQoJyNwYWRncmlkJyk7XG52YXIgJHBhZHMgPSAkcGFkZ3JpZC5maW5kKCdidXR0b24nKTtcbnZhciAkc3RlcGxpbmUgPSAkKCcjc3RlcGxpbmUnKTtcbnZhciAkc3RlcEJ1dHRvbnMgPSAkc3RlcGxpbmUuZmluZCgnYnV0dG9uJyk7XG5cbi8vIGFwcC1sZXZlbCBmbGFnc1xudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG4vLyBTZXQgdXAgdGhlIGFwcC5cbi8vIFRoaXMgZGlkbid0IG5lZWQgdG8gYmUgd2l0aGluIGFuIElJRkU6IHBsYWluIG9sZCBpbXBlcmF0aXZlIGNvZGUgd291bGQgaGF2ZSB3b3JrZWQuXG4vLyBUaGUgd3JhcHBpbmcgaW4gYW4gSUlGRSBoaW50cyBhdCBob3cgdGhlIGNvZGUgY291bGQgYmUgbW9kdWxhcmlzZWQgbGF0ZXIuIFRoZSBzYW1lIGFwcGxpZXMgdG8gdGhlXG4vLyAgJ2NvbnRyb2xsZXInIGZ1bmN0aW9ucywgZnVydGhlciBkb3duIHRoZSBmaWxlLlxuKGZ1bmN0aW9uIGJvb3RzdHJhcCAoKSB7XG5cdHZhciBkZWZhdWx0U2VxdWVuY2UgPSBbXTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydsdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuXG5cdC8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxuXHR2YXIgZHJ1bVBhdGhzID0ge1xuXHRcdCdjbGFwJyAgOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsXG5cdFx0J2Nvd2JsJyA6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsXG5cdFx0J2h0bScgICA6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLFxuXHRcdCdsdG0nICAgOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJyxcblx0XHQnbXRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsXG5cdFx0J3JpbXNoJyA6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsXG5cdFx0J3RhbWJvJyA6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVidcblx0fTtcblxuXHQvLyBzZXQgdXAgdGhlIERydW0gb2JqZWN0cyBpbiB0aGUgZHJ1bSBjb2xsZWN0aW9uXG5cdGZvciggdmFyIGRydW0gaW4gZHJ1bVBhdGhzICkgeyBpZiggZHJ1bVBhdGhzLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0XHQvLyBsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcblx0XHRkcnVtT2JqZWN0c1sgZHJ1bSBdID0gbmV3IERydW0oIGRydW1QYXRoc1sgZHJ1bSBdLCBjb250ZXh0ICk7XG5cdH19XG5cblxuXHQvLyAnbG9hZCcgdGhlIGRlZmF1bHQgc2VxdWVuY2UgaW50byB0aGUgc2VxdWVuY2VyXG5cdGRlZmF1bHRTZXF1ZW5jZS5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXAsIGluZGV4ICkge1xuXHRcdHN0ZXAuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwRHJ1bSApIHtcblx0XHRcdHNlcXVlbmNlci5zZXRTdGVwKCBpbmRleCwgZHJ1bU9iamVjdHNbIHN0ZXBEcnVtIF0gKTtcblx0XHR9KTtcblx0fSk7XG5cbn0pKCk7XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSW50ZXJmYWNlIChldmVudCBoYW5kbGluZylcbi8vIC0gdGhpcyBjb3VsZCBwcm9iYWJseSBiZWNvbWUgYSBraW5kIG9mIG1hc3RlciBvYmplY3QsIG9yIGNvbnRyb2xsZXJcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLy8gZXZlbnQgaGFuZGxlcnNcbi8vXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0aWYoIHNlcXVlbmNlci5wbGF5aW5nICkgc2VxdWVuY2VyLnN0b3AoKTtcblx0XHRlbHNlIHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZVBhZEhpdCAoIGV2ZW50ICkge1xuXHRuaXgoIGV2ZW50ICk7XG5cdGRydW1PYmplY3RzWyBldmVudC50YXJnZXQuaWQgXS5iYW5nKCk7XG5cblx0aWYoIHByZXZpb3VzRHJ1bSAmJiBwcmV2aW91c0RydW0ubmFtZSAhPT0gZXZlbnQudGFyZ2V0LmlkICkge1xuXHRcdCRwYWRncmlkLmZpbmQoICcjJyArIHByZXZpb3VzRHJ1bS5uYW1lICkudG9nZ2xlQ2xhc3MoICdwcmV2aW91cycsIGZhbHNlICk7XG5cdH1cblx0cHJldmlvdXNEcnVtID0gZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdO1xuXHQkcGFkZ3JpZC5maW5kKCAnIycgKyBldmVudC50YXJnZXQuaWQgKS50b2dnbGVDbGFzcyggJ3ByZXZpb3VzJywgdHJ1ZSApO1xuXG5cdHNob3dEcnVtU3RlcHMoKTtcblxuXHRpZiggL21vdXNlLy50ZXN0KCBldmVudC50eXBlICkgKSB0b2dnbGVNb3VzZURvd25UcnVlKCk7XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcCAoIGV2ZW50LCBzdGVwSWQgKSB7XG5cdHZhciBzdGVwQnV0dG9uID0gJHN0ZXBCdXR0b25zLmVxKCBzdGVwSWQgKTtcblx0Zmxhc2goIHN0ZXBCdXR0b24uZmluZCgnc3BhbicpLCAnb3JhbmdlJyApO1xufVxuXG5cbmZ1bmN0aW9uIGhhbmRsZVN0ZXBUYXAgKCkge1xuXHR2YXIgc3RlcElkID0gcGFyc2VJbnQoIHRoaXMuaWQuc3Vic3RyKDQpLCAxMCApO1xuXHRuaXgoIGV2ZW50ICk7XG5cdGlmKCAhcHJldmlvdXNEcnVtICkgcmV0dXJuO1xuXHRzZXF1ZW5jZXIuc2V0U3RlcCggc3RlcElkLCBwcmV2aW91c0RydW0gKTtcblx0c2hvd0RydW1TdGVwcygpO1xufVxuXG5cbi8vIGhlbHBlciBmdW5jdGlvbnNcbi8vICh1c3VhbGx5IGNhbGxlZCB3aXRoaW4gYSBoYW5kbGVyLCBidXQgc29tZXRpbWVzIGNhbGxlZCBBUyBhIGhhbmRsZXIpXG4vL1xuZnVuY3Rpb24gbml4ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cbmZ1bmN0aW9uIGZsYXNoICggZWxlbSwgY29sb3VyICkge1xuXHR2YXIgJGVsZW0gPSAkKCBlbGVtICk7XG5cdHZhciBmbGFzaENsYXNzID0gJ2ZsYXNoLS0nICsgY29sb3VyO1xuXHQkZWxlbS5hZGRDbGFzcyggZmxhc2hDbGFzcyApO1xuXHQkZWxlbS5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJGVsZW0ucmVtb3ZlQ2xhc3MoIGZsYXNoQ2xhc3MgKTsgfSk7XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cblxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuZnVuY3Rpb24gc2hvd0RydW1TdGVwcyAoKSB7XG5cdHZhciBkcnVtU3RlcHMgPSBzZXF1ZW5jZXIuc2VxdWVuY2UucmVkdWNlKCBmaWx0ZXJGb3JMYXN0RHJ1bSwgW10gKTtcblxuXHQkc3RlcEJ1dHRvbnMuZWFjaCggZnVuY3Rpb24gdHVybk9mZkxFRCAoIGluZGV4LCBidXR0b24gKSB7XG5cdFx0aWYoIGRydW1TdGVwc1swXSA9PT0gaW5kZXggKSB7XG5cdFx0XHQkKGJ1dHRvbikuZmluZCgnLmxlZCcpLnRvZ2dsZUNsYXNzKCdsZWQtb24nLCB0cnVlICk7XG5cdFx0XHRkcnVtU3RlcHMuc2hpZnQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgZmFsc2UgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uZmlsdGVyIHdoaWNoXG5mdW5jdGlvbiBmaWx0ZXJGb3JMYXN0RHJ1bSAoIGFjY3VtLCBjdXJyZW50U3RlcERydW1zLCBpbmRleCApIHtcblx0Ly8gY3VycmVudCA9PT0gc3RlcERydW1zIGkuZS4gYW4gYXJyYXkgb2YgZHJ1bXMgYXQgc3RlcFsgaW5kZXggXVxuXHRpZiggY3VycmVudFN0ZXBEcnVtcy5zb21lKCBmaW5kRHJ1bSApICkgYWNjdW0ucHVzaCggaW5kZXggKTtcblx0cmV0dXJuIGFjY3VtO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uc29tZSwgcmV0dXJuaW5nIHRydWUgaWYgdGhlIHBhc3NlZC1pbiBkcnVtIG1hdGNoZXMgcHJldmlvdXNEcnVtXG5mdW5jdGlvbiBmaW5kRHJ1bSAoIGluc3BlY3RlZCApIHtcblx0cmV0dXJuIGluc3BlY3RlZC5uYW1lID09PSBwcmV2aW91c0RydW0ubmFtZTtcbn1cblxuXG4vL1xuLy8gJ2NvbnRyb2xsZXJzJ1xuLy9cblxuLy8gc2V0cyB1cCBiaW5kaW5ncyBiZXR3ZWVuIHRoZSAnZHJ1bSBwYWQnIGJ1dHRvbnMgYW5kIHRoZSBkcnVtcyBhbmQgc2VxdWVuY2VyXG4oZnVuY3Rpb24gcGFkQ29udHJvbGxlciAoKSB7XG5cdC8vIEVhY2ggcGFkICdsaXN0ZW5zJyB0byBpdHMgYXNzb2NpYXRlZCBkcnVtIGZvciAnYmFuZycgZXZlbnRzXG5cdC8vICBhbmQgZmxhc2hlcyB3aGVuIGl0IGhlYXJzIG9uZS5cblx0JHBhZHMuZWFjaCggZnVuY3Rpb24gc2V0RHJ1bUV2ZW50cyAoIGluZGV4LCBwYWQgKXtcblx0XHR2YXIgJHBhZCA9ICQocGFkKTtcblx0XHRkcnVtT2JqZWN0c1sgcGFkLmlkIF0ub24oICdiYW5nJywgZnVuY3Rpb24gb25CYW5nICggLypldmVudCovICl7XG5cdFx0XHRmbGFzaCggcGFkLCAncmVkJyApO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyB0b2dnbGUgbW91c2Vkb3duIGZsYWcsIHVzZWQgZm9yIGRyYWdnaW5nIGFuICdhY3RpdmVcIiBtb3VzZSBvdmVyIG1hY2hpbmUgY29udHJvbHNcblx0JGRvY3VtZW50Lm9uKCdtb3VzZWRvd24nLCB0b2dnbGVNb3VzZURvd25UcnVlICk7XG5cdCRkb2N1bWVudC5vbignbW91c2V1cCcsIHRvZ2dsZU1vdXNlRG93bkZhbHNlICk7XG5cblx0Ly8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG5cdCRwYWRncmlkLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG5cdH0pO1xuXHQkcGFkZ3JpZC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG59KSgpO1xuXG5cbihmdW5jdGlvbiBzZXF1ZW5jZXJDb250cm9sbGVyICgpIHtcblx0JChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cdCRzdGVwbGluZS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlU3RlcFRhcCApO1xuXG5cdHNlcXVlbmNlci5vbigncGxheVN0ZXAnLCBoYW5kbGVTdGVwICk7XG59KSgpO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==