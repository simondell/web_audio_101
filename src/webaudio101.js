// Web Audio 101
// An experiment borrowing heavily from hTML5Rocks
// http://www.html5rocks.com/en/tutorials/webaudio/intro/
//
// A drum-machine with basic sequencer to get a feel for launching and
//  mixing sounds, stringing them together in time, building an app rather than
//  a document (because I usually make documents for my day-job, even when they're made
//  like a SPA). Potentially, this project could be used to learn about FRP, as well,
//  as the interface is crying out for better code aesthestics, but this is for a
//  later stage.


// Avoid the app adding globals with an IIFE
// http://benalman.com/news/2010/11/immediately-invoked-function-expression/
// http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html
(function (window, $){

// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// app namespace
var drumMachine = {}
var dm = drumMachine;


//
// the "synth"
// drum sounds, channel to play them through, loader to load them etc
//

dm.synth = {}

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

dm.synth.bang = bang;


// list sounds, then load and play them
var drums = {
	'clap'  : { grid: 1, path: 'assets/707/707CLAP.WAV', buffer: undefined, source: context.createBufferSource() },
	'cowbl' : { grid: 2, path: 'assets/707/707COWBL.WAV', buffer: undefined, source: context.createBufferSource() },
	'htm'   : { grid: 3, path: 'assets/707/707HTM.WAV', buffer: undefined, source: context.createBufferSource() },
	'ltm'   : { grid: 4, path: 'assets/707/707LTM.WAV', buffer: undefined, source: context.createBufferSource() },
	'mtm'   : { grid: 5, path: 'assets/707/707MTM.WAV', buffer: undefined, source: context.createBufferSource() },
	'rimsh' : { grid: 6, path: 'assets/707/707RIMSH.WAV', buffer: undefined, source: context.createBufferSource() },
	'tambo' : { grid: 7, path: 'assets/707/707TAMBO.WAV', buffer: undefined, source: context.createBufferSource() }
};

dm.synth.drums = drums;

for( drum in drums ) { if( drums.hasOwnProperty( drum ) ){
	drums[drum].source.connect(context.destination);
	loadSound( drums[drum].path, function onloadHandler () { console.log('onload', arguments); } );
}}





//
// Interface (event handling)
// - this could probably become a kind of master object, or controller

var mousedown = false;

function handlePadHit ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();
	// event.stopPropagation();
	dm.synth.bang( dm.synth.drums[ event.target.id ] );

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
$(document).on('mousedown', function toggleMouseDownTrue () { mousedown = true; } );
$(document).on('mouseup', function toggleMouseDownFalse () { mousedown = false; } );

// delegate drum pad taps to padgrid
// $(document).on('keydown', handlePadHit );
$('#padgrid').on('touchstart', 'button', handlePadHit );
$('#padgrid').on('mousedown', 'button', handlePadHit );
$('#padgrid').on('mouseenter', 'button', function ( event ) {
	if( mousedown ) { handlePadHit( event ); }
});


}(window, $));
// end anti-global IIFE