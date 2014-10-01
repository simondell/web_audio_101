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
		this.startX = event.pageX;
		this.startY = event.pageY;

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
function Drum ( name, path, context ) {
	var drum = this;
	this.path = path;
	this.context = context;
	// this.name = /(?:\/707)(\w+)(?:\.)/i.exec( path )[1].toLowerCase();
	this.name = name;

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
	defaultSequence.push(['kick', 'tambo', 'mtm', 'cowbl']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo', 'clap', 'cowbl', 'pop' ]);
	defaultSequence.push([]);
	defaultSequence.push(['snare', 'tambo', 'mtm']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push(['ltm']);
	defaultSequence.push(['tambo', 'mtm']);
	defaultSequence.push(['tambo', 'pop']);
	defaultSequence.push(['tambo', 'clap']);
	defaultSequence.push([]);
	defaultSequence.push(['tambo']);
	defaultSequence.push(['rimsh']);


	// list sounds, then load and play them
	var drumPaths = {
		'clap'    : 'assets/707/707CLAP.WAV',
		'cowbl'   : 'assets/707/707COWBL.WAV',
		'htm'     : 'assets/707/707HTM.WAV',
		'ltm'     : 'assets/707/707LTM.WAV',
		'mtm'     : 'assets/707/707MTM.WAV',
		'rimsh'   : 'assets/707/707RIMSH.WAV',
		'tambo'   : 'assets/707/707TAMBO.WAV',
		'kick'    : 'assets/HR16/BDRM02.WAV',
		'crash'   : 'assets/HR16/CRASH01.WAV',
		'glass'   : 'assets/HR16/GLASBELL.WAV',
		'pop'     : 'assets/HR16/POP01.WAV',
		'ride'    : 'assets/HR16/RIDE01.WAV',
		'scratch' : 'assets/HR16/SCRATCH1.WAV',
		'sfx1'    : 'assets/HR16/SFX1-A.WAV',
		'sfx2'    : 'assets/HR16/SFX1.WAV',
		'snare'   : 'assets/HR16/SNARE01B.WAV'
	};

	// set up the Drum objects in the drum collection
	for( var drum in drumPaths ) { if( drumPaths.hasOwnProperty( drum ) ){
		// loadSound( drums[drum].path );
		drumObjects[ drum ] = new Drum( drum, drumPaths[ drum ], context );
	}}


	// 'load' the default sequence into the sequencer
	defaultSequence.forEach( function ( step, index ) {
		step.forEach( function ( stepDrum ) {
			sequencer.setStep( index, drumObjects[ stepDrum ] );
		});
	});

	sequencer.tempo = 107;
	turnTempoDial( 107 );

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
	var halfDeltaY = knob.deltaY;
	if( sequencer.tempo - halfDeltaY > 19 &&
			sequencer.tempo - halfDeltaY < 241 ) {
		sequencer.tempo = Math.floor( sequencer.tempo - halfDeltaY );
	}
	$controls.find('#tempo').text( sequencer.tempo );
	turnTempoDial( sequencer.tempo );
}


function turnTempoDial( tempo ) {
	var elem = $controls.find('#tempoCtrl')[0];
	var cssProperty = (elem.style.transform)? 'transform': 'webkitTransform';
	// $controls.find('#tempoCtrl').css({'transform': 'rotateZ(' + (tempo - 120) + 'deg)' })
	elem.style[ cssProperty ] = 'rotateZ(' + (tempo - 120) + 'deg)';
}



//
// 'controllers'
//

(function globalController () {
	$document.on('keydown', handleKeys );
	$document.on('touchstart', function (e) { e.preventDefault(); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG5cbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG52YXIgdHJhbnNpdGlvbkVuZCA9ICd3ZWJraXRUcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kIG9UcmFuc2l0aW9uRW5kIG1zVHJhbnNpdGlvbkVuZCB0cmFuc2l0aW9uZW5kJztcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIEhlbHBlciBvYmplY3RzXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEV2ZW50ZWRcbiAqIGFkZHMgZXZlbnQgaGFuZGxpbmcgdG8gb2JqZWN0cywgZGVsZWdhdGluZyB0byAkXG4gKi9cbmZ1bmN0aW9uIEV2ZW50ZWQgKCkge31cbkV2ZW50ZWQucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogRXZlbnRlZCxcblx0b246IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vbiggZXZlbnROYW1lLCBjYWxsYmFjayApOyByZXR1cm4gdGhpczsgfSxcblx0b2ZmOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKSB7ICQodGhpcykub2ZmKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHR0cmlnZ2VyOiBmdW5jdGlvbiAoIGV2ZW50TmFtZSwgYXJncyApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUsIGFyZ3MgKTsgcmV0dXJuIHRoaXM7IH1cbn07XG5cblxuZnVuY3Rpb24gRHJhZ2dhYmxlICggZWxlbSwgc2V0dGluZ3MgKSB7XG5cdHNldHRpbmdzID0gc2V0dGluZ3MgfHwgeyBvbnN0YXJ0OiBudWxsLCBvbmRyYWc6IG51bGwsIG9uZW5kOiBudWxsIH07XG5cdHRoaXMuZWxlbSA9IGVsZW07XG5cdHRoaXMuJGVsZW0gPSAkKGVsZW0pO1xuXG5cdHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcblx0dGhpcy5zdGFydFggPSB0aGlzLnN0YXJ0WSA9IG51bGw7XG5cdHRoaXMuZGVsdGFYID0gdGhpcy5kZWx0YVkgPSBudWxsO1xuXG5cdHRoaXMub25zdGFydCA9IHNldHRpbmdzLm9uc3RhcnQ7XG5cdHRoaXMub25kcmFnID0gc2V0dGluZ3Mub25kcmFnO1xuXHR0aGlzLm9uZW5kID0gc2V0dGluZ3Mub25lbmQ7XG5cblx0dGhpcy4kZWxlbS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAkLnByb3h5KCB0aGlzLnN0YXJ0LCB0aGlzICkgKTtcblxuXHR0aGlzLmRyYWdQcm94eSA9IG51bGw7XG5cdHRoaXMuZW5kUHJveHkgPSBudWxsO1xufVxuRHJhZ2dhYmxlLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IERyYWdnYWJsZSxcblxuXHRzdGFydDogZnVuY3Rpb24gc3RhcnQgKCBldmVudCApIHtcbi8vIGNvbnNvbGUubG9nKCAnc3RhcnQnICk7XG5cdFx0bml4KGV2ZW50KTtcblx0XHR0aGlzLmRyYWdnaW5nID0gdHJ1ZTtcblx0XHR0aGlzLnN0YXJ0WCA9IGV2ZW50LnBhZ2VYO1xuXHRcdHRoaXMuc3RhcnRZID0gZXZlbnQucGFnZVk7XG5cblx0XHR0aGlzLmRyYWdQcm94eSA9ICQucHJveHkoIHRoaXMuZHJhZywgdGhpcyApO1xuXHRcdHRoaXMuZW5kUHJveHkgPSAkLnByb3h5KCB0aGlzLmVuZCwgdGhpcyApO1xuXHRcdCRkb2N1bWVudC5vbignbW91c2Vtb3ZlIHRvdWNobW92ZScsIHRoaXMuZHJhZ1Byb3h5ICk7XG5cdFx0JGRvY3VtZW50Lm9uKCdtb3VzZXVwIHRvdWNoZW5kJywgdGhpcy5lbmRQcm94eSApO1xuXG5cdFx0aWYoIHRoaXMub25zdGFydCApIHRoaXMub25zdGFydCh0aGlzKTtcblx0fSxcblxuXHRkcmFnOiBmdW5jdGlvbiBkcmFnICggZXZlbnQgKSB7XG5cdFx0aWYoICF0aGlzLmRyYWdnaW5nICkgcmV0dXJuO1xuLy8gY29uc29sZS5sb2coICdkcmFnJywgYXJndW1lbnRzICk7XG5cdFx0bml4KGV2ZW50KTtcblx0XHR0aGlzLmRlbHRhWCA9IGV2ZW50LnBhZ2VYIC0gdGhpcy5zdGFydFg7XG5cdFx0dGhpcy5kZWx0YVkgPSBldmVudC5wYWdlWSAtIHRoaXMuc3RhcnRZO1xuXHRcdHRoaXMuc3RhcnRYID0gZXZlbnQucGFnZVg7XG5cdFx0dGhpcy5zdGFydFkgPSBldmVudC5wYWdlWTtcblxuXHRcdGlmKCB0aGlzLm9uZHJhZyApIHRoaXMub25kcmFnKHRoaXMpO1xuXHR9LFxuXG5cdGVuZDogZnVuY3Rpb24gZW5kICggZXZlbnQgKSB7XG5cdFx0bml4KGV2ZW50KTtcbi8vIGNvbnNvbGUubG9nKCAnZW5kJywgYXJndW1lbnRzICk7XG5cdFx0dGhpcy5kcmFnZ2luZyA9IGZhbHNlO1xuXHRcdCRkb2N1bWVudC5vZmYoJ21vdXNlbW92ZSB0b3VjaG1vdmUnLCB0aGlzLmRyYWdQcm94eSApO1xuXHRcdCRkb2N1bWVudC5vZmYoJ21vdXNldXAgdG91Y2hlbmQnLCB0aGlzLmVuZFByb3h5ICk7XG5cdH1cblxufTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBUaGUgJ3N5bnRoJyBzZWN0aW9uXG4vLyBEcnVtIHNvdW5kc1xuLy8gKFRoZSBsb2FkZXIgaXMgbm93IHBhcnQgb2YgdGhlIERydW0gb2JqZWN0LCBhbmQgdGhlIGNvbnRleHQvY2hhbm5lbCB0byBwbGF5XG4vLyAgdGhyb3VnaCBpcyBkZWZpbmVkIGJlbG93IGluIHRoZSAnYm9vdHN0cmFwJyBzZWN0aW9uIGJlY2F1c2UgdGhhdCBzdHVmZiBpcyBtb3JlXG4vLyAgbGlrZSBhcHAgY29kZSBvciBhIG1haW4oKS4gT3RoZXIgc291bmQgbWFuaXB1bGF0aW9uIGNvZGUgbWF5IGFwcGVhciBoZXJlIGxhdGVyKVxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG4vKipcbiAqIEB0eXBlIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBuYW1lLCBwYXRoLCBjb250ZXh0ICkge1xuXHR2YXIgZHJ1bSA9IHRoaXM7XG5cdHRoaXMucGF0aCA9IHBhdGg7XG5cdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG5cdC8vIHRoaXMubmFtZSA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pLmV4ZWMoIHBhdGggKVsxXS50b0xvd2VyQ2FzZSgpO1xuXHR0aGlzLm5hbWUgPSBuYW1lO1xuXG5cdChmdW5jdGlvbiBsb2FkU291bmQoKSB7XG5cdFx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0XHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0XHRkcnVtLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH0pO1xuXG5cdFx0fTtcblxuXHRcdHJlcXVlc3Qub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cdFx0cmVxdWVzdC5zZW5kKCk7XG5cdH0pKCk7XG59XG5cbkRydW0ucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcbkRydW0ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHJ1bTtcblxuRHJ1bS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uIGJhbmcgKCkge1xuXHR2YXIgbm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0bm9kZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblx0bm9kZS5jb25uZWN0KCB0aGlzLmNvbnRleHQuZGVzdGluYXRpb24gKTtcblx0bm9kZS5zdGFydCggMCApO1xuXG5cdHRoaXMudHJpZ2dlcignYmFuZycpO1xufTtcblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc2VxdWVuY2VyJyBzZWN0aW9uXG4vLyBEYXRhIHN0cnVjdHVyZXMgZm9yIHRoZSBzZXF1ZW5jZSwgYSBkZWZhdWx0IHNlcXVlbmNlLCBmdW5jdGlvbnMgZm9yIHBsYXliYWNrXG4vL1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKipcbiAqIEB0eXBlIFNlcXVlbmNlclxuICogQGV4dGVuZHMgRXZlbnRlZFxuICogaGFuZGxlcyB0aGUgc2VxdWVuY2VcbiAqL1xuZnVuY3Rpb24gU2VxdWVuY2VyICgpIHtcblx0dGhpcy5zZXF1ZW5jZSA9IFtdO1xuXHR0aGlzLnNlcU1heExlbiA9IDE2O1xuXHR0aGlzLmN1cnJlbnRTdGVwID0gMDtcblx0dGhpcy5uZXh0VGltZXIgPSBudWxsOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cblx0dGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cdHRoaXMudGVtcG8gPSAxMDc7XG5cdHRoaXMuZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblx0dmFyIGNvdW50ID0gdGhpcy5zZXFNYXhMZW47XG5cdHdoaWxlKCBjb3VudC0tICkgdGhpcy5zZXF1ZW5jZS5wdXNoKCBbXSApO1xufVxuXG5TZXF1ZW5jZXIucHJvdG90eXBlID0gbmV3IEV2ZW50ZWQoKTtcblNlcXVlbmNlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTZXF1ZW5jZXI7XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCAoKSB7XG5cdHRoaXMucGxheWluZyA9IHRydWU7XG5cdHRoaXMucGxheVN0ZXAoKTtcbn07XG5cblNlcXVlbmNlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AgKCkge1xuXHR0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblx0Y2xlYXJUaW1lb3V0KCB0aGlzLm5leHRUaW1lciApO1xufTtcblxuU2VxdWVuY2VyLnByb3RvdHlwZS5wbGF5U3RlcCA9IGZ1bmN0aW9uIHBsYXlTdGVwICgpIHtcblx0dmFyIHNlcXIgPSB0aGlzO1xuXHR2YXIgc3RlcERydW1zID0gdGhpcy5zZXF1ZW5jZVsgdGhpcy5jdXJyZW50U3RlcCBdO1xuXHR2YXIgZHJ1bUNvdW50ID0gc3RlcERydW1zLmxlbmd0aDtcblx0dmFyIGJvdW5kUGxheVN0ZXAgPSAkLnByb3h5KCBzZXFyLnBsYXlTdGVwLCBzZXFyICk7XG5cblx0dmFyIGludGVydmFsID0gKDYwIC8gKHRoaXMudGVtcG8gKiB0aGlzLmRpdmlzaW9uKSkgKiAxMDAwO1xuXG5cdHRoaXMudHJpZ2dlcigncGxheVN0ZXAnLCB0aGlzLmN1cnJlbnRTdGVwICk7XG5cblx0d2hpbGUoIGRydW1Db3VudC0tICkge1xuXHRcdHN0ZXBEcnVtc1sgZHJ1bUNvdW50IF0uYmFuZygpO1xuXHR9XG5cblx0dGhpcy5jdXJyZW50U3RlcCA9ICsrdGhpcy5jdXJyZW50U3RlcCAlIHRoaXMuc2VxTWF4TGVuO1xuXG5cdGlmKCB0aGlzLnBsYXlpbmcgKSB7XG5cdFx0dGhpcy5uZXh0VGltZXIgPSBzZXRUaW1lb3V0KCBib3VuZFBsYXlTdGVwLCBpbnRlcnZhbCApO1xuXHR9XG59O1xuXG5TZXF1ZW5jZXIucHJvdG90eXBlLnNldFN0ZXAgPSBmdW5jdGlvbiBzZXRTdGVwICggc3RlcElkLCBkcnVtICkge1xuXHR2YXIgc3RlcCA9IHRoaXMuc2VxdWVuY2VbIHN0ZXBJZCBdO1xuXHR2YXIgZHJ1bVBvc2l0aW9uID0gJC5pbkFycmF5KCBkcnVtLCBzdGVwICk7XG5cblx0Ly8gaWYgdGhlIGRydW0gaXMgYWxyZWFkeSBpbiB0aGUgc3RlcCBhcnJheSwgcmVtb3ZlIGl0XG5cdGlmKCBkcnVtUG9zaXRpb24gPiAtMSApIHtcdHN0ZXAuc3BsaWNlKCBkcnVtUG9zaXRpb24sIDEgKTsgfVxuXHQvLyBvdGhlcndpc2UsIGFkZCBpdFxuXHRlbHNlIGlmKCBkcnVtICkgc3RlcC5wdXNoKCBkcnVtICk7XG59O1xuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIGJvb3RzdHJhcCAtIHN0YXJ0IHRoZSBhcHBcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8vIGFwcC1sZXZlbCBvYmplY3RzLCBjb2xsZWN0aW9ucyBldGNcbnZhciBkcnVtT2JqZWN0cyA9IHt9O1xudmFyIHNlcXVlbmNlciA9IG5ldyBTZXF1ZW5jZXIoKTtcbnZhciBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xudmFyIHByZXZpb3VzRHJ1bSA9IG51bGw7XG5cbi8vIGNhY2hlZCAkKGVsZW1lbnRzKVxudmFyICRkb2N1bWVudCA9ICQoZG9jdW1lbnQpO1xudmFyICRwYWRncmlkID0gJCgnI3BhZGdyaWQnKTtcbnZhciAkcGFkcyA9ICRwYWRncmlkLmZpbmQoJ2J1dHRvbicpO1xudmFyICRzdGVwbGluZSA9ICQoJyNzdGVwbGluZScpO1xudmFyICRzdGVwQnV0dG9ucyA9ICRzdGVwbGluZS5maW5kKCdidXR0b24nKTtcbnZhciAkY29udHJvbHMgPSAkKCcjc2VxdWVuY2VyLS1jb250cm9scycpO1xuXG4vLyBhcHAtbGV2ZWwgZmxhZ3NcbnZhciBtb3VzZWRvd24gPSBmYWxzZTtcblxuLy8gU2V0IHVwIHRoZSBhcHAuXG4vLyBUaGlzIGRpZG4ndCBuZWVkIHRvIGJlIHdpdGhpbiBhbiBJSUZFOiBwbGFpbiBvbGQgaW1wZXJhdGl2ZSBjb2RlIHdvdWxkIGhhdmUgd29ya2VkLlxuLy8gVGhlIHdyYXBwaW5nIGluIGFuIElJRkUgaGludHMgYXQgaG93IHRoZSBjb2RlIGNvdWxkIGJlIG1vZHVsYXJpc2VkIGxhdGVyLiBUaGUgc2FtZSBhcHBsaWVzIHRvIHRoZVxuLy8gICdjb250cm9sbGVyJyBmdW5jdGlvbnMsIGZ1cnRoZXIgZG93biB0aGUgZmlsZS5cbihmdW5jdGlvbiBib290c3RyYXAgKCkge1xuXHR2YXIgZGVmYXVsdFNlcXVlbmNlID0gW107XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsna2ljaycsICd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnLCAnY293YmwnLCAncG9wJyBdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3NuYXJlJywgJ3RhbWJvJywgJ210bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goW10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ2x0bSddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAncG9wJ10pO1xuXHRkZWZhdWx0U2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5cdGRlZmF1bHRTZXF1ZW5jZS5wdXNoKFtdKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcblx0ZGVmYXVsdFNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuXG5cdC8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxuXHR2YXIgZHJ1bVBhdGhzID0ge1xuXHRcdCdjbGFwJyAgICA6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJyxcblx0XHQnY293YmwnICAgOiAnYXNzZXRzLzcwNy83MDdDT1dCTC5XQVYnLFxuXHRcdCdodG0nICAgICA6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLFxuXHRcdCdsdG0nICAgICA6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLFxuXHRcdCdtdG0nICAgICA6ICdhc3NldHMvNzA3LzcwN01UTS5XQVYnLFxuXHRcdCdyaW1zaCcgICA6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsXG5cdFx0J3RhbWJvJyAgIDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJyxcblx0XHQna2ljaycgICAgOiAnYXNzZXRzL0hSMTYvQkRSTTAyLldBVicsXG5cdFx0J2NyYXNoJyAgIDogJ2Fzc2V0cy9IUjE2L0NSQVNIMDEuV0FWJyxcblx0XHQnZ2xhc3MnICAgOiAnYXNzZXRzL0hSMTYvR0xBU0JFTEwuV0FWJyxcblx0XHQncG9wJyAgICAgOiAnYXNzZXRzL0hSMTYvUE9QMDEuV0FWJyxcblx0XHQncmlkZScgICAgOiAnYXNzZXRzL0hSMTYvUklERTAxLldBVicsXG5cdFx0J3NjcmF0Y2gnIDogJ2Fzc2V0cy9IUjE2L1NDUkFUQ0gxLldBVicsXG5cdFx0J3NmeDEnICAgIDogJ2Fzc2V0cy9IUjE2L1NGWDEtQS5XQVYnLFxuXHRcdCdzZngyJyAgICA6ICdhc3NldHMvSFIxNi9TRlgxLldBVicsXG5cdFx0J3NuYXJlJyAgIDogJ2Fzc2V0cy9IUjE2L1NOQVJFMDFCLldBVidcblx0fTtcblxuXHQvLyBzZXQgdXAgdGhlIERydW0gb2JqZWN0cyBpbiB0aGUgZHJ1bSBjb2xsZWN0aW9uXG5cdGZvciggdmFyIGRydW0gaW4gZHJ1bVBhdGhzICkgeyBpZiggZHJ1bVBhdGhzLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0XHQvLyBsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcblx0XHRkcnVtT2JqZWN0c1sgZHJ1bSBdID0gbmV3IERydW0oIGRydW0sIGRydW1QYXRoc1sgZHJ1bSBdLCBjb250ZXh0ICk7XG5cdH19XG5cblxuXHQvLyAnbG9hZCcgdGhlIGRlZmF1bHQgc2VxdWVuY2UgaW50byB0aGUgc2VxdWVuY2VyXG5cdGRlZmF1bHRTZXF1ZW5jZS5mb3JFYWNoKCBmdW5jdGlvbiAoIHN0ZXAsIGluZGV4ICkge1xuXHRcdHN0ZXAuZm9yRWFjaCggZnVuY3Rpb24gKCBzdGVwRHJ1bSApIHtcblx0XHRcdHNlcXVlbmNlci5zZXRTdGVwKCBpbmRleCwgZHJ1bU9iamVjdHNbIHN0ZXBEcnVtIF0gKTtcblx0XHR9KTtcblx0fSk7XG5cblx0c2VxdWVuY2VyLnRlbXBvID0gMTA3O1xuXHR0dXJuVGVtcG9EaWFsKCAxMDcgKTtcblxufSkoKTtcblxuXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG4vLyBldmVudCBoYW5kbGVyc1xuLy9cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcblx0c3dpdGNoKCBldmVudC53aGljaCApIHtcblx0Y2FzZSAzMjpcblx0XHRpZiggc2VxdWVuY2VyLnBsYXlpbmcgKSBzZXF1ZW5jZXIuc3RvcCgpO1xuXHRcdGVsc2Ugc2VxdWVuY2VyLnN0YXJ0KCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdG5peCggZXZlbnQgKTtcblx0ZHJ1bU9iamVjdHNbIGV2ZW50LnRhcmdldC5pZCBdLmJhbmcoKTtcblxuXHRpZiggcHJldmlvdXNEcnVtICYmIHByZXZpb3VzRHJ1bS5uYW1lICE9PSBldmVudC50YXJnZXQuaWQgKSB7XG5cdFx0JHBhZGdyaWQuZmluZCggJyMnICsgcHJldmlvdXNEcnVtLm5hbWUgKS50b2dnbGVDbGFzcyggJ3ByZXZpb3VzJywgZmFsc2UgKTtcblx0fVxuXHRwcmV2aW91c0RydW0gPSBkcnVtT2JqZWN0c1sgZXZlbnQudGFyZ2V0LmlkIF07XG5cdCRwYWRncmlkLmZpbmQoICcjJyArIGV2ZW50LnRhcmdldC5pZCApLnRvZ2dsZUNsYXNzKCAncHJldmlvdXMnLCB0cnVlICk7XG5cblx0c2hvd0RydW1TdGVwcygpO1xuXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIHRvZ2dsZU1vdXNlRG93blRydWUoKTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVDb250cm9scyAoIGV2ZW50ICkge1xuXHRuaXgoIGV2ZW50ICk7XG5cblx0c3dpdGNoKCBldmVudC50YXJnZXQuaWQgKSB7XG5cdGNhc2UgXCJyd25kXCI6XG5cdFx0Zmxhc2goIGV2ZW50LnRhcmdldCwgJ29yYW5nZScgKTtcblx0XHRzZXF1ZW5jZXIuY3VycmVudFN0ZXAgPSAwO1xuXHRcdGJyZWFrO1xuXHRjYXNlIFwicGxheVwiOlxuXHRcdGlmKHNlcXVlbmNlci5wbGF5aW5nKSByZXR1cm47XG5cdFx0Zmxhc2goIGV2ZW50LnRhcmdldCwgJ2dyZWVuJyApO1xuXHRcdHNlcXVlbmNlci5zdGFydCgpO1xuXHRcdGJyZWFrO1xuXHRjYXNlIFwic3RvcFwiOlxuXHRcdGZsYXNoKCBldmVudC50YXJnZXQsICdyZWQnICk7XG5cdFx0c2VxdWVuY2VyLnN0b3AoKTtcblx0XHRicmVhaztcblx0fVxufVxuXG5cblxuZnVuY3Rpb24gaGFuZGxlU3RlcFRhcCAoKSB7XG5cdHZhciBzdGVwSWQgPSBwYXJzZUludCggdGhpcy5pZC5zdWJzdHIoNCksIDEwICk7XG5cdG5peCggZXZlbnQgKTtcblx0aWYoICFwcmV2aW91c0RydW0gKSByZXR1cm47XG5cdGZsYXNoKCB0aGlzLCAnZGFya2dyZXknKTtcblx0c2VxdWVuY2VyLnNldFN0ZXAoIHN0ZXBJZCwgcHJldmlvdXNEcnVtICk7XG5cdHNob3dEcnVtU3RlcHMoKTtcbn1cblxuXG5mdW5jdGlvbiBoYW5kbGVTdGVwICggZXZlbnQsIHN0ZXBJZCApIHtcblx0dmFyIHN0ZXBCdXR0b24gPSAkc3RlcEJ1dHRvbnMuZXEoIHN0ZXBJZCApO1xuXHRmbGFzaCggc3RlcEJ1dHRvbi5maW5kKCdzcGFuJyksICdvcmFuZ2UnICk7XG5cdGlmKCBzdGVwSWQgJSA0ID09PSAwICkgZmxhc2goICRjb250cm9scy5maW5kKCcjcGxheScpLCAnZ3JlZW4nICk7XG59XG5cblxuXG5cbi8vIGhlbHBlciBmdW5jdGlvbnNcbi8vICh1c3VhbGx5IGNhbGxlZCB3aXRoaW4gYSBoYW5kbGVyLCBidXQgc29tZXRpbWVzIGNhbGxlZCBBUyBhIGhhbmRsZXIpXG4vL1xuZnVuY3Rpb24gbml4ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG5cbmZ1bmN0aW9uIGZsYXNoICggZWxlbSwgY29sb3VyICkge1xuXHR2YXIgJGVsZW0gPSAkKCBlbGVtICk7XG5cdHZhciBmbGFzaENsYXNzID0gJ2ZsYXNoLS0nICsgY29sb3VyO1xuXHQkZWxlbS5hZGRDbGFzcyggZmxhc2hDbGFzcyApO1xuXHQkZWxlbS5vbmUoIHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uICgpIHsgJGVsZW0ucmVtb3ZlQ2xhc3MoIGZsYXNoQ2xhc3MgKTsgfSk7XG59XG5cblxuZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH1cblxuXG5mdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9XG5cblxuZnVuY3Rpb24gc2hvd0RydW1TdGVwcyAoKSB7XG5cdHZhciBkcnVtU3RlcHMgPSBzZXF1ZW5jZXIuc2VxdWVuY2UucmVkdWNlKCBmaWx0ZXJGb3JMYXN0RHJ1bSwgW10gKTtcblxuXHQkc3RlcEJ1dHRvbnMuZWFjaCggZnVuY3Rpb24gdHVybk9mZkxFRCAoIGluZGV4LCBidXR0b24gKSB7XG5cdFx0aWYoIGRydW1TdGVwc1swXSA9PT0gaW5kZXggKSB7XG5cdFx0XHQkKGJ1dHRvbikuZmluZCgnLmxlZCcpLnRvZ2dsZUNsYXNzKCdsZWQtb24nLCB0cnVlICk7XG5cdFx0XHRkcnVtU3RlcHMuc2hpZnQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JChidXR0b24pLmZpbmQoJy5sZWQnKS50b2dnbGVDbGFzcygnbGVkLW9uJywgZmFsc2UgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBjYWxsYmFjayBmb3IgW10uZmlsdGVyIHdoaWNoXG5mdW5jdGlvbiBmaWx0ZXJGb3JMYXN0RHJ1bSAoIGFjY3VtLCBjdXJyZW50U3RlcERydW1zLCBpbmRleCApIHtcblx0aWYoIGN1cnJlbnRTdGVwRHJ1bXMuc29tZSggZmluZERydW0gKSApIGFjY3VtLnB1c2goIGluZGV4ICk7XG5cdHJldHVybiBhY2N1bTtcbn1cblxuLy8gY2FsbGJhY2sgZm9yIFtdLnNvbWUsIHJldHVybmluZyB0cnVlIGlmIHRoZSBwYXNzZWQtaW4gZHJ1bSBtYXRjaGVzIHByZXZpb3VzRHJ1bVxuZnVuY3Rpb24gZmluZERydW0gKCBpbnNwZWN0ZWQgKSB7XG5cdHJldHVybiBpbnNwZWN0ZWQubmFtZSA9PT0gcHJldmlvdXNEcnVtLm5hbWU7XG59XG5cblxuZnVuY3Rpb24gY2hhbmdlVGVtcG8gKCBrbm9iICkge1xuXHR2YXIgaGFsZkRlbHRhWSA9IGtub2IuZGVsdGFZO1xuXHRpZiggc2VxdWVuY2VyLnRlbXBvIC0gaGFsZkRlbHRhWSA+IDE5ICYmXG5cdFx0XHRzZXF1ZW5jZXIudGVtcG8gLSBoYWxmRGVsdGFZIDwgMjQxICkge1xuXHRcdHNlcXVlbmNlci50ZW1wbyA9IE1hdGguZmxvb3IoIHNlcXVlbmNlci50ZW1wbyAtIGhhbGZEZWx0YVkgKTtcblx0fVxuXHQkY29udHJvbHMuZmluZCgnI3RlbXBvJykudGV4dCggc2VxdWVuY2VyLnRlbXBvICk7XG5cdHR1cm5UZW1wb0RpYWwoIHNlcXVlbmNlci50ZW1wbyApO1xufVxuXG5cbmZ1bmN0aW9uIHR1cm5UZW1wb0RpYWwoIHRlbXBvICkge1xuXHR2YXIgZWxlbSA9ICRjb250cm9scy5maW5kKCcjdGVtcG9DdHJsJylbMF07XG5cdHZhciBjc3NQcm9wZXJ0eSA9IChlbGVtLnN0eWxlLnRyYW5zZm9ybSk/ICd0cmFuc2Zvcm0nOiAnd2Via2l0VHJhbnNmb3JtJztcblx0Ly8gJGNvbnRyb2xzLmZpbmQoJyN0ZW1wb0N0cmwnKS5jc3Moeyd0cmFuc2Zvcm0nOiAncm90YXRlWignICsgKHRlbXBvIC0gMTIwKSArICdkZWcpJyB9KVxuXHRlbGVtLnN0eWxlWyBjc3NQcm9wZXJ0eSBdID0gJ3JvdGF0ZVooJyArICh0ZW1wbyAtIDEyMCkgKyAnZGVnKSc7XG59XG5cblxuXG4vL1xuLy8gJ2NvbnRyb2xsZXJzJ1xuLy9cblxuKGZ1bmN0aW9uIGdsb2JhbENvbnRyb2xsZXIgKCkge1xuXHQkZG9jdW1lbnQub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG5cdCRkb2N1bWVudC5vbigndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChlKSB7IGUucHJldmVudERlZmF1bHQoKTsgfSk7XG59KSgpO1xuXG4vLyBzZXRzIHVwIGJpbmRpbmdzIGJldHdlZW4gdGhlICdkcnVtIHBhZCcgYnV0dG9ucyBhbmQgdGhlIGRydW1zIGFuZCBzZXF1ZW5jZXJcbihmdW5jdGlvbiBwYWRDb250cm9sbGVyICgpIHtcblx0Ly8gRWFjaCBwYWQgJ2xpc3RlbnMnIHRvIGl0cyBhc3NvY2lhdGVkIGRydW0gZm9yICdiYW5nJyBldmVudHNcblx0Ly8gIGFuZCBmbGFzaGVzIHdoZW4gaXQgaGVhcnMgb25lLlxuXHQkcGFkcy5lYWNoKCBmdW5jdGlvbiBzZXREcnVtRXZlbnRzICggaW5kZXgsIHBhZCApe1xuXHRcdHZhciAkcGFkID0gJChwYWQpO1xuXHRcdGRydW1PYmplY3RzWyBwYWQuaWQgXS5vbiggJ2JhbmcnLCBmdW5jdGlvbiBvbkJhbmcgKCAvKmV2ZW50Ki8gKXtcblx0XHRcdGZsYXNoKCBwYWQsICdyZWQnICk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuXHQkZG9jdW1lbnQub24oJ21vdXNlZG93bicsIHRvZ2dsZU1vdXNlRG93blRydWUgKTtcblx0JGRvY3VtZW50Lm9uKCdtb3VzZXVwJywgdG9nZ2xlTW91c2VEb3duRmFsc2UgKTtcblxuXHQvLyBkZWxlZ2F0ZSBkcnVtIHBhZCB0YXBzIHRvIHBhZGdyaWRcblx0JHBhZGdyaWQub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRpZiggbW91c2Vkb3duICkgeyBoYW5kbGVQYWRIaXQoIGV2ZW50ICk7IH1cblx0fSk7XG5cdCRwYWRncmlkLm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbn0pKCk7XG5cblxuKGZ1bmN0aW9uIHNlcXVlbmNlckNvbnRyb2xsZXIgKCkge1xuXHQvLyBzaG93IHRlbXBvXG5cdCRjb250cm9scy5maW5kKCcjdGVtcG8nKS50ZXh0KCBzZXF1ZW5jZXIudGVtcG8gKTtcblxuXHQvLyBET00gZXZlbnRzXG5cdCRzdGVwbGluZS5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlU3RlcFRhcCApO1xuXHQkY29udHJvbHMub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZUNvbnRyb2xzICk7XG5cblx0Ly8gcm90YXJ5IGNvbm5lY3Rpb25cblx0dmFyIHRlbXBvQ29udHJvbCA9IG5ldyBEcmFnZ2FibGUoICQoJyN0ZW1wb0N0cmwnKSwge1xuXHRcdG9uZHJhZzogY2hhbmdlVGVtcG9cblx0fSk7XG5cblx0Ly8gaW50ZXJuYWwgZXZlbnRzXG5cdHNlcXVlbmNlci5vbiggJ3BsYXlTdGVwJywgaGFuZGxlU3RlcCApO1xufSkoKTtcblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=