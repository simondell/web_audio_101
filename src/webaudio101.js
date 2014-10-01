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