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


function Draggable ( elem, settings ) {
	settings = settings || { onstart: null, ondrag: null, onend: null };
	this.elem = elem;
	this.$elem = $(elem);

	this.dragging = false;
	this.startX = this.startY = null;
	this.deltaX = this.deltaY = null;

	this.onstart = settings.onstart;
	this.ondrag = settings.ondrag;
	this.onend = settings.onend;

	this.$elem.on('mousedown touchstart', $.proxy( this.start, this ) );

	this.dragProxy = null;
	this.endProxy = null;
}
Draggable.prototype = {
	constructor: Draggable,

	start: function start ( event ) {
// console.log( 'start' );
		nix(event);
		this.dragging = true;
		this.startX = event.pageX;
		this.startY = event.pageY;

		this.dragProxy = $.proxy( this.drag, this );
		this.endProxy = $.proxy( this.end, this );
		$document.on('mousemove touchmove', this.dragProxy );
		$document.on('mouseup touchend', this.endProxy );

		if( this.onstart ) this.onstart(this);
	},

	drag: function drag ( event ) {
		if( !this.dragging ) return;
// console.log( 'drag', arguments );
		nix(event);
		this.deltaX = event.pageX - this.startX;
		this.deltaY = event.pageY - this.startY;
		if( this.ondrag ) this.ondrag(this);
	},

	end: function end ( event ) {
		nix(event);
// console.log( 'end', arguments );
		this.dragging = false;
		$document.off('mousemove touchmove', this.dragProxy );
		$document.off('mouseup touchend', this.endProxy );
	}

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

	var interval = (60 / (this.tempo * this.division)) * 1000;

	this.trigger('playStep', this.currentStep );

	while( drumCount-- ) {
		stepDrums[ drumCount ].bang();
	}

	this.currentStep = ++this.currentStep % this.seqMaxLen;

	if( this.playing ) {
		this.nextTimer = setTimeout( boundPlayStep, interval );
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
	if( currentStepDrums.some( findDrum ) ) accum.push( index );
	return accum;
}

// callback for [].some, returning true if the passed-in drum matches previousDrum
function findDrum ( inspected ) {
	return inspected.name === previousDrum.name;
}


function changeTempo ( knob ) {
	var halfDeltaY = knob.deltaY / 6;
	if( sequencer.tempo - halfDeltaY > 19 &&
			sequencer.tempo - halfDeltaY < 241 ) {
		sequencer.tempo = Math.floor( sequencer.tempo - halfDeltaY );
	}
	$controls.find('#tempo').text( sequencer.tempo );
}




//
// 'controllers'
//

(function globalController () {
	$(document).on('keydown', handleKeys );
})();

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
	$stepline.on('mousedown touchstart', 'button', handleStepTap );
	$controls.on('mousedown touchstart', 'button', handleControls );

	// rotary connection
	var tempoControl = new Draggable( $('#tempoCtrl'), {
		ondrag: changeTempo
	});

	// internal events
	sequencer.on( 'playStep', handleStep );
})();


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxudmFyIHRyYW5zaXRpb25FbmQgPSAnd2Via2l0VHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBvVHJhbnNpdGlvbkVuZCBtc1RyYW5zaXRpb25FbmQgdHJhbnNpdGlvbmVuZCc7XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBIZWxwZXIgb2JqZWN0c1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBFdmVudGVkXG4gKiBhZGRzIGV2ZW50IGhhbmRsaW5nIHRvIG9iamVjdHMsIGRlbGVnYXRpbmcgdG8gJFxuICovXG5mdW5jdGlvbiBFdmVudGVkICgpIHt9XG5FdmVudGVkLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IEV2ZW50ZWQsXG5cdG9uOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub24oIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdG9mZjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9mZiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0dHJpZ2dlcjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGFyZ3MgKSB7ICQodGhpcykudHJpZ2dlciggZXZlbnROYW1lLCBhcmdzICk7IHJldHVybiB0aGlzOyB9XG59O1xuXG5cbmZ1bmN0aW9uIERyYWdnYWJsZSAoIGVsZW0sIHNldHRpbmdzICkge1xuXHRzZXR0aW5ncyA9IHNldHRpbmdzIHx8IHsgb25zdGFydDogbnVsbCwgb25kcmFnOiBudWxsLCBvbmVuZDogbnVsbCB9O1xuXHR0aGlzLmVsZW0gPSBlbGVtO1xuXHR0aGlzLiRlbGVtID0gJChlbGVtKTtcblxuXHR0aGlzLmRyYWdnaW5nID0gZmFsc2U7XG5cdHRoaXMuc3RhcnRYID0gdGhpcy5zdGFydFkgPSBudWxsO1xuXHR0aGlzLmRlbHRhWCA9IHRoaXMuZGVsdGFZID0gbnVsbDtcblxuXHR0aGlzLm9uc3RhcnQgPSBzZXR0aW5ncy5vbnN0YXJ0O1xuXHR0aGlzLm9uZHJhZyA9IHNldHRpbmdzLm9uZHJhZztcblx0dGhpcy5vbmVuZCA9IHNldHRpbmdzLm9uZW5kO1xuXG5cdHRoaXMuJGVsZW0ub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgJC5wcm94eSggdGhpcy5zdGFydCwgdGhpcyApICk7XG5cblx0dGhpcy5kcmFnUHJveHkgPSBudWxsO1xuXHR0aGlzLmVuZFByb3h5ID0gbnVsbDtcbn1cbkRyYWdnYWJsZS5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBEcmFnZ2FibGUsXG5cblx0c3RhcnQ6IGZ1bmN0aW9uIHN0YXJ0ICggZXZlbnQgKSB7XG4vLyBjb25zb2xlLmxvZyggJ3N0YXJ0JyApO1xuXHRcdG5peChldmVudCk7XG5cdFx0dGhpcy5kcmFnZ2luZyA9IHRydWU7XG5cdFx0dGhpcy5zdGFydFggPSBldmVudC5wYWdlWDtcblx0XHR0aGlzLnN0YXJ0WSA9IGV2ZW50LnBhZ2VZO1xuXG5cdFx0dGhpcy5kcmFnUHJveHkgPSAkLnByb3h5KCB0aGlzLmRyYWcsIHRoaXMgKTtcblx0XHR0aGlzLmVuZFByb3h5ID0gJC5wcm94eSggdGhpcy5lbmQsIHRoaXMgKTtcblx0XHQkZG9jdW1lbnQub24oJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLmRyYWdQcm94eSApO1xuXHRcdCRkb2N1bWVudC5vbignbW91c2V1cCB0b3VjaGVuZCcsIHRoaXMuZW5kUHJveHkgKTtcblxuXHRcdGlmKCB0aGlzLm9uc3RhcnQgKSB0aGlzLm9uc3RhcnQodGhpcyk7XG5cdH0sXG5cblx0ZHJhZzogZnVuY3Rpb24gZHJhZyAoIGV2ZW50ICkge1xuXHRcdGlmKCAhdGhpcy5kcmFnZ2luZyApIHJldHVybjtcbi8vIGNvbnNvbGUubG9nKCAnZHJhZycsIGFyZ3VtZW50cyApO1xuXHRcdG5peChldmVudCk7XG5cdFx0dGhpcy5kZWx0YVggPSBldmVudC5wYWdlWCAtIHRoaXMuc3RhcnRYO1xuXHRcdHRoaXMuZGVsdGFZID0gZXZlbnQucGFnZVkgLSB0aGlzLnN0YXJ0WTtcblx0XHRpZiggdGhpcy5vbmRyYWcgKSB0aGlzLm9uZHJhZyh0aGlzKTtcblx0fSxcblxuXHRlbmQ6IGZ1bmN0aW9uIGVuZCAoIGV2ZW50ICkge1xuXHRcdG5peChldmVudCk7XG4vLyBjb25zb2xlLmxvZyggJ2VuZCcsIGFyZ3VtZW50cyApO1xuXHRcdHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHQkZG9jdW1lbnQub2ZmKCdtb3VzZW1vdmUgdG91Y2htb3ZlJywgdGhpcy5kcmFnUHJveHkgKTtcblx0XHQkZG9jdW1lbnQub2ZmKCdtb3VzZXVwIHRvdWNoZW5kJywgdGhpcy5lbmRQcm94eSApO1xuXHR9XG5cbn07XG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gVGhlICdzeW50aCcgc2VjdGlvblxuLy8gRHJ1bSBzb3VuZHNcbi8vIChUaGUgbG9hZGVyIGlzIG5vdyBwYXJ0IG9mIHRoZSBEcnVtIG9iamVjdCwgYW5kIHRoZSBjb250ZXh0L2NoYW5uZWwgdG8gcGxheVxuLy8gIHRocm91Z2ggaXMgZGVmaW5lZCBiZWxvdyBpbiB0aGUgJ2Jvb3RzdHJhcCcgc2VjdGlvbiBiZWNhdXNlIHRoYXQgc3R1ZmYgaXMgbW9yZVxuLy8gIGxpa2UgYXBwIGNvZGUgb3IgYSBtYWluKCkuIE90aGVyIHNvdW5kIG1hbmlwdWxhdGlvbiBjb2RlIG1heSBhcHBlYXIgaGVyZSBsYXRlcilcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuLyoqXG4gKiBAdHlwZSBEcnVtXG4gKiBAZXh0ZW5kcyBFdmVudGVkXG4gKiBoYW5kbGVzIGxvYWRpbmcgJiBkZWNvZGluZyBzYW1wbGVzLCBhbmQgYXR0YWNoaW5nIHRvIHRoZSBhdWRpbyBncmFwaFxuICovXG5mdW5jdGlvbiBEcnVtICggcGF0aCwgY29udGV4dCApIHtcblx0dmFyIGRydW0gPSB0aGlzO1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXHR0aGlzLm5hbWUgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaS5leGVjKCBwYXRoIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHQoZnVuY3Rpb24gbG9hZFNvdW5kKCkge1xuXHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdFx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdFx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXG5cdFx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdFx0ZHJ1bS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHR9KTtcblxuXHRcdH07XG5cblx0XHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXHRcdHJlcXVlc3Quc2VuZCgpO1xuXHR9KSgpO1xufVxuXG5EcnVtLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5EcnVtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERydW07XG5cbkRydW0ucHJvdG90eXBlLmJhbmcgPSBmdW5jdGlvbiBiYW5nICgpIHtcblx0dmFyIG5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cdG5vZGUuYnVmZmVyID0gdGhpcy5idWZmZXI7XG5cdG5vZGUuY29ubmVjdCggdGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uICk7XG5cdG5vZGUuc3RhcnQoIDAgKTtcblxuXHR0aGlzLnRyaWdnZXIoJ2JhbmcnKTtcbn07XG5cblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3NlcXVlbmNlcicgc2VjdGlvblxuLy8gRGF0YSBzdHJ1Y3R1cmVzIGZvciB0aGUgc2VxdWVuY2UsIGEgZGVmYXVsdCBzZXF1ZW5jZSwgZnVuY3Rpb25zIGZvciBwbGF5YmFja1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuLyoqXG4gKiBAdHlwZSBTZXF1ZW5jZXJcbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgdGhlIHNlcXVlbmNlXG4gKi9cbmZ1bmN0aW9uIFNlcXVlbmNlciAoKSB7XG5cdHRoaXMuc2VxdWVuY2UgPSBbXTtcblx0dGhpcy5zZXFNYXhMZW4gPSAxNjtcblx0dGhpcy5jdXJyZW50U3RlcCA9IDA7XG5cdHRoaXMubmV4dFRpbWVyID0gbnVsbDsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG5cdHRoaXMucGxheWluZyA9IGZhbHNlO1xuXHR0aGlzLnRlbXBvID0gMTA3O1xuXHR0aGlzLmRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxuXG5cdHZhciBjb3VudCA9IHRoaXMuc2VxTWF4TGVuO1xuXHR3aGlsZSggY291bnQtLSApIHRoaXMuc2VxdWVuY2UucHVzaCggW10gKTtcbn1cblxuU2VxdWVuY2VyLnByb3RvdHlwZSA9IG5ldyBFdmVudGVkKCk7XG5TZXF1ZW5jZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2VxdWVuY2VyO1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSB0cnVlO1xuXHR0aGlzLnBsYXlTdGVwKCk7XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wICgpIHtcblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdGNsZWFyVGltZW91dCggdGhpcy5uZXh0VGltZXIgKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUucGxheVN0ZXAgPSBmdW5jdGlvbiBwbGF5U3RlcCAoKSB7XG5cdHZhciBzZXFyID0gdGhpcztcblx0dmFyIHN0ZXBEcnVtcyA9IHRoaXMuc2VxdWVuY2VbIHRoaXMuY3VycmVudFN0ZXAgXTtcblx0dmFyIGRydW1Db3VudCA9IHN0ZXBEcnVtcy5sZW5ndGg7XG5cdHZhciBib3VuZFBsYXlTdGVwID0gJC5wcm94eSggc2Vxci5wbGF5U3RlcCwgc2VxciApO1xuXG5cdHZhciBpbnRlcnZhbCA9ICg2MCAvICh0aGlzLnRlbXBvICogdGhpcy5kaXZpc2lvbikpICogMTAwMDtcblxuXHR0aGlzLnRyaWdnZXIoJ3BsYXlTdGVwJywgdGhpcy5jdXJyZW50U3RlcCApO1xuXG5cdHdoaWxlKCBkcnVtQ291bnQtLSApIHtcblx0XHRzdGVwRHJ1bXNbIGRydW1Db3VudCBdLmJhbmcoKTtcblx0fVxuXG5cdHRoaXMuY3VycmVudFN0ZXAgPSArK3RoaXMuY3VycmVudFN0ZXAgJSB0aGlzLnNlcU1heExlbjtcblxuXHRpZiggdGhpcy5wbGF5aW5nICkge1xuXHRcdHRoaXMubmV4dFRpbWVyID0gc2V0VGltZW91dCggYm91bmRQbGF5U3RlcCwgaW50ZXJ2YWwgKTtcblx0fVxufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5zZXRTdGVwID0gZnVuY3Rpb24gc2V0U3RlcCAoIHN0ZXBJZCwgZHJ1bSApIHtcblx0dmFyIHN0ZXAgPSB0aGlzLnNlcXVlbmNlWyBzdGVwSWQgXTtcblx0dmFyIGRydW1Qb3NpdGlvbiA9ICQuaW5BcnJheSggZHJ1bSwgc3RlcCApO1xuXG5cdC8vIGlmIHRoZSBkcnVtIGlzIGFscmVhZHkgaW4gdGhlIHN0ZXAgYXJyYXksIHJlbW92ZSBpdFxuXHRpZiggZHJ1bVBvc2l0aW9uID4gLTEgKSB7XHRzdGVwLnNwbGljZSggZHJ1bVBvc2l0aW9uLCAxICk7IH1cblx0Ly8gb3RoZXJ3aXNlLCBhZGQgaXRcblx0ZWxzZSBpZiggZHJ1bSApIHN0ZXAucHVzaCggZHJ1bSApO1xufTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBib290c3RyYXAgLSBzdGFydCB0aGUgYXBwXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vLyBhcHAtbGV2ZWwgb2JqZWN0cywgY29sbGVjdGlvbnMgZXRjXG52YXIgZHJ1bU9iamVjdHMgPSB7fTtcbnZhciBzZXF1ZW5jZXIgPSBuZXcgU2VxdWVuY2VyKCk7XG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciBwcmV2aW91c0RydW0gPSBudWxsO1xuXG4vLyBjYWNoZWQgJChlbGVtZW50cylcbnZhciAkZG9jdW1lbnQgPSAkKGRvY3VtZW50KTtcbnZhciAkcGFkZ3JpZCA9ICQoJyNwYWRncmlkJyk7XG52YXIgJHBhZHMgPSAkcGFkZ3JpZC5maW5kKCdidXR0b24nKTtcbnZhciAkc3RlcGxpbmUgPSAkKCcjc3RlcGxpbmUnKTtcbnZhciAkc3RlcEJ1dHRvbnMgPSAkc3RlcGxpbmUuZmluZCgnYnV0dG9uJyk7XG52YXIgJGNvbnRyb2xzID0gJCgnI3NlcXVlbmNlci0tY29udHJvbHMnKTtcblxuLy8gYXBwLWxldmVsIGZsYWdzXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5cbi8vIFNldCB1cCB0aGUgYXBwLlxuLy8gVGhpcyBkaWRuJ3QgbmVlZCB0byBiZSB3aXRoaW4gYW4gSUlGRTogcGxhaW4gb2xkIGltcGVyYXRpdmUgY29kZSB3b3VsZCBoYXZlIHdvcmtlZC5cbi8vIFRoZSB3cmFwcGluZyBpbiBhbiBJSUZFIGhpbnRzIGF0IGhvdyB0aGUgY29kZSBjb3VsZCBiZSBtb2R1bGFyaXNlZCBsYXRlci4gVGhlIHNhbWUgYXBwbGllcyB0byB0aGVcbi8vICAnY29udHJvbGxlcicgZnVuY3Rpb25zLCBmdXJ0aGVyIGRvd24gdGhlIGZpbGUuXG4oZnVuY3Rpb24gYm9vdHN0cmFwICgpIHtcblx0dmFyIGRlZmF1bHRTZXF1ZW5jZSA9IFtdO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCcsICdjb3dibCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ2x0bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5cblx0Ly8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG5cdHZhciBkcnVtUGF0aHMgPSB7XG5cdFx0J2NsYXAnICA6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJyxcblx0XHQnY293YmwnIDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJyxcblx0XHQnaHRtJyAgIDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsXG5cdFx0J2x0bScgICA6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLFxuXHRcdCdtdG0nICAgOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJyxcblx0XHQncmltc2gnIDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJyxcblx0XHQndGFtYm8nIDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJ1xuXHR9O1xuXG5cdC8vIHNldCB1cCB0aGUgRHJ1bSBvYmplY3RzIGluIHRoZSBkcnVtIGNvbGxlY3Rpb25cblx0Zm9yKCB2YXIgZHJ1bSBpbiBkcnVtUGF0aHMgKSB7IGlmKCBkcnVtUGF0aHMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHRcdC8vIGxvYWRTb3VuZCggZHJ1bXNbZHJ1bV0ucGF0aCApO1xuXHRcdGRydW1PYmplY3RzWyBkcnVtIF0gPSBuZXcgRHJ1bSggZHJ1bVBhdGhzWyBkcnVtIF0sIGNvbnRleHQgKTtcblx0fX1cblxuXG5cdC8vICdsb2FkJyB0aGUgZGVmYXVsdCBzZXF1ZW5jZSBpbnRvIHRoZSBzZXF1ZW5jZXJcblx0ZGVmYXVsdFNlcXVlbmNlLmZvckVhY2goIGZ1bmN0aW9uICggc3RlcCwgaW5kZXggKSB7XG5cdFx0c3RlcC5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXBEcnVtICkge1xuXHRcdFx0c2VxdWVuY2VyLnNldFN0ZXAoIGluZGV4LCBkcnVtT2JqZWN0c1sgc3RlcERydW0gXSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSkoKTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG4vLyBldmVudCBoYW5kbGVyc1xuLy9cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcblx0c3dpdGNoKCBldmVudC53aGljaCApIHtcblx0Y2FzZSAzMjpcblx0XHRpZiggc2VxdWVuY2VyLnBsYXlpbmcgKSBzZXF1ZW5jZXIuc3RvcCgpO1xuXHRcdGVsc2Ugc2VxdWVuY2VyLnN0YXJ0KCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdG5peCggZXZlbnQgKTtcblx0ZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdLmJhbmcoKTtcblxuXHRpZiggcHJldmlvdXNEcnVtICYmIHByZXZpb3VzRHJ1bS5uYW1lICE9PSBldmVudC50YXJnZXQuaWQgKSB7XG5cdFx0JHBhZGdyaWQuZmluZCggJyMnICsgcHJldmlvdXNEcnVtLm5hbWUgKS50b2dnbGVDbGFzcyggJ3ByZXZpb3VzJywgZmFsc2UgKTtcblx0fVxuXHRwcmV2aW91c0RydW0gPSBkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF07XG5cdCRwYWRncmlkLmZpbmQoICcjJyArIGV2ZW50LnRhcmdldC5pZCApLnRvZ2dsZUNsYXNzKCAncHJldmlvdXMnLCB0cnVlICk7XG5cblx0c2hvd0RydW1TdGVwcygpO1xuXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIHRvZ2dsZU1vdXNlRG93blRydWUoKTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVDb250cm9scyAoIGV2ZW50ICkge1xuXHRuaXgoIGV2ZW50ICk7XG5cblx0c3dpdGNoKCBldmVudC50YXJnZXQuaWQgKSB7XG5cdGNhc2UgXCJyd25kXCI6XG5cdFx0Zmxhc2goIGV2ZW50LnRhcmdldCwgJ29yYW5nZScgKTtcblx0XHRzZXF1ZW5jZXIuY3VycmVudFN0ZXAgPSAwO1xuXHRcdGJyZWFrO1xuXHRjYXNlIFwicGxheVwiOlxuXHRcdGlmKHNlcXVlbmNlci5wbGF5aW5nKSByZXR1cm47XG5cdFx0Zmxhc2goIGV2ZW50LnRhcmdldCwgJ2dyZWVuJyApO1xuXHRcdHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuXHRjYXNlIFwic3RvcFwiOlxuXHRcdGZsYXNoKCBldmVudC50YXJnZXQsICdyZWQnICk7XG5cdFx0c2VxdWVuY2VyLnN0b3AoKTtcblx0XHRicmVhaztcblx0fVxufVxuXG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcFRhcCAoKSB7XG5cdHZhciBzdGVwSWQgPSBwYXJzZUludCggdGhpcy5pZC5zdWJzdHIoNCksIDEwICk7XG5cdG5peCggZXZlbnQgKTtcblx0aWYoICFwcmV2aW91c0RydW0gKSByZXR1cm47XG5cdGZsYXNoKCB0aGlzLCAnZGFya2dyZXknKTtcblx0c2VxdWVuY2VyLnNldFN0ZXAoIHN0ZXBJZCwgcHJldmlvdXNEcnVtICk7XG5cdHNob3dEcnVtU3RlcHMoKTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVTdGVwICggZXZlbnQsIHN0ZXBJZCApIHtcblx0dmFyIHN0ZXBCdXR0b24gPSAkc3RlcEJ1dHRvbnMuZXEoIHN0ZXBJZCApO1xuXHRmbGFzaCggc3RlcEJ1dHRvbi5maW5kKCdzcGFuJyksICdvcmFuZ2UnICk7XG5cdGlmKCBzdGVwSWQgJSA0ID09PSAwICkgZmxhc2goICRjb250cm9scy5maW5kKCcjcGxheScpLCAnZ3JlZW4nICk7XG59XG5cblxuXG5cbi8vIGhlbHBlciBmdW5jdGlvbnNcbi8vICh1c3VhbGx5IGNhbGxlZCB3aXRoaW4gYSBoYW5kbGVyLCBidXQgc29tZXRpbWVzIGNhbGxlZCBBUyBhIGhhbmRsZXIpXG4vL1xuZnVuY3Rpb24gbml4ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cbmZ1bmN0aW9uIGZsYXNoICggZWxlbSwgY29sb3VyICkge1xuXHR2YXIgJGVsZW0gPSAkKCBlbGVtICk7XG5cdHZhciBmbGFzaENsYXNzID0gJ2ZsYXNoLS0nICsgY29sb3VyO1xuXHQkZWxlbS5hZGRDbGFzcyggZmxhc2hDbGFzcyApO1xuXHQkZWxlbS5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJGVsZW0ucmVtb3ZlQ2xhc3MoIGZsYXNoQ2xhc3MgKTsgfSk7XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cblxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuZnVuY3Rpb24gc2hvd0RydW1TdGVwcyAoKSB7XG5cdHZhciBkcnVtU3RlcHMgPSBzZXF1ZW5jZXIuc2VxdWVuY2UucmVkdWNlKCBmaWx0ZXJGb3JMYXN0RHJ1bSwgW10gKTtcblxuXHQkc3RlcEJ1dHRvbnMuZWFjaCggZnVuY3Rpb24gdHVybk9mZkxFRCAoIGluZGV4LCBidXR0b24gKSB7XG5cdFx0aWYoIGRydW1TdGVwc1swXSA9PT0gaW5kZXggKSB7XG5cdFx0XHQkKGJ1dHRvbikuZmluZCgnLmxlZCcpLnRvZ2dsZUNsYXNzKCdsZWQtb24nLCB0cnVlICk7XG5cdFx0XHRkcnVtU3RlcHMuc2hpZnQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgZmFsc2UgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uZmlsdGVyIHdoaWNoXG5mdW5jdGlvbiBmaWx0ZXJGb3JMYXN0RHJ1bSAoIGFjY3VtLCBjdXJyZW50U3RlcERydW1zLCBpbmRleCApIHtcblx0aWYoIGN1cnJlbnRTdGVwRHJ1bXMuc29tZSggZmluZERydW0gKSApIGFjY3VtLnB1c2goIGluZGV4ICk7XG5cdHJldHVybiBhY2N1bTtcbn1cblxuLy8gY2FsbGJhY2sgZm9yIFtdLnNvbWUsIHJldHVybmluZyB0cnVlIGlmIHRoZSBwYXNzZWQtaW4gZHJ1bSBtYXRjaGVzIHByZXZpb3VzRHJ1bVxuZnVuY3Rpb24gZmluZERydW0gKCBpbnNwZWN0ZWQgKSB7XG5cdHJldHVybiBpbnNwZWN0ZWQubmFtZSA9PT0gcHJldmlvdXNEcnVtLm5hbWU7XG59XG5cblxuZnVuY3Rpb24gY2hhbmdlVGVtcG8gKCBrbm9iICkge1xuXHR2YXIgaGFsZkRlbHRhWSA9IGtub2IuZGVsdGFZIC8gNjtcblx0aWYoIHNlcXVlbmNlci50ZW1wbyAtIGhhbGZEZWx0YVkgPiAxOSAmJlxuXHRcdFx0c2VxdWVuY2VyLnRlbXBvIC0gaGFsZkRlbHRhWSA8IDI0MSApIHtcblx0XHRzZXF1ZW5jZXIudGVtcG8gPSBNYXRoLmZsb29yKCBzZXF1ZW5jZXIudGVtcG8gLSBoYWxmRGVsdGFZICk7XG5cdH1cblx0JGNvbnRyb2xzLmZpbmQoJyN0ZW1wbycpLnRleHQoIHNlcXVlbmNlci50ZW1wbyApO1xufVxuXG5cblxuXG4vL1xuLy8gJ2NvbnRyb2xsZXJzJ1xuLy9cblxuKGZ1bmN0aW9uIGdsb2JhbENvbnRyb2xsZXIgKCkge1xuXHQkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcbn0pKCk7XG5cbi8vIHNldHMgdXAgYmluZGluZ3MgYmV0d2VlbiB0aGUgJ2RydW0gcGFkJyBidXR0b25zIGFuZCB0aGUgZHJ1bXMgYW5kIHNlcXVlbmNlclxuKGZ1bmN0aW9uIHBhZENvbnRyb2xsZXIgKCkge1xuXHQvLyBFYWNoIHBhZCAnbGlzdGVucycgdG8gaXRzIGFzc29jaWF0ZWQgZHJ1bSBmb3IgJ2JhbmcnIGV2ZW50c1xuXHQvLyAgYW5kIGZsYXNoZXMgd2hlbiBpdCBoZWFycyBvbmUuXG5cdCRwYWRzLmVhY2goIGZ1bmN0aW9uIHNldERydW1FdmVudHMgKCBpbmRleCwgcGFkICl7XG5cdFx0dmFyICRwYWQgPSAkKHBhZCk7XG5cdFx0ZHJ1bU9iamVjdHNbIHBhZC5pZCBdLm9uKCAnYmFuZycsIGZ1bmN0aW9uIG9uQmFuZyAoIC8qZXZlbnQqLyApe1xuXHRcdFx0Zmxhc2goIHBhZCwgJ3JlZCcgKTtcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG5cdCRkb2N1bWVudC5vbignbW91c2Vkb3duJywgdG9nZ2xlTW91c2VEb3duVHJ1ZSApO1xuXHQkZG9jdW1lbnQub24oJ21vdXNldXAnLCB0b2dnbGVNb3VzZURvd25GYWxzZSApO1xuXG5cdC8vIGRlbGVnYXRlIGRydW0gcGFkIHRhcHMgdG8gcGFkZ3JpZFxuXHQkcGFkZ3JpZC5vbignbW91c2VlbnRlcicsICdidXR0b24nLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxuXHR9KTtcblx0JHBhZGdyaWQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xufSkoKTtcblxuXG4oZnVuY3Rpb24gc2VxdWVuY2VyQ29udHJvbGxlciAoKSB7XG5cdC8vIHNob3cgdGVtcG9cblx0JGNvbnRyb2xzLmZpbmQoJyN0ZW1wbycpLnRleHQoIHNlcXVlbmNlci50ZW1wbyApO1xuXG5cdC8vIERPTSBldmVudHNcblx0JHN0ZXBsaW5lLm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVTdGVwVGFwICk7XG5cdCRjb250cm9scy5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlQ29udHJvbHMgKTtcblxuXHQvLyByb3RhcnkgY29ubmVjdGlvblxuXHR2YXIgdGVtcG9Db250cm9sID0gbmV3IERyYWdnYWJsZSggJCgnI3RlbXBvQ3RybCcpLCB7XG5cdFx0b25kcmFnOiBjaGFuZ2VUZW1wb1xuXHR9KTtcblxuXHQvLyBpbnRlcm5hbCBldmVudHNcblx0c2VxdWVuY2VyLm9uKCAncGxheVN0ZXAnLCBoYW5kbGVTdGVwICk7XG59KSgpO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==