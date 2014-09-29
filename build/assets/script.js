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
	trigger: function ( eventName, callback ) { $(this).trigger( eventName ); return this; }
}




// **********************************************
//
// The 'synth' section
// drum sounds, channel to play them through, loader to load them etc
//
// **********************************************


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




/**
 * @class Drum
 * @extends Evented
 * handles loading & decoding samples, and attaching to the audio graph
 */
function Drum ( path, context ) {
	this.path = path;
	this.context = context;
}
Drum.prototype = new Evented();
Drum.prototype.constructor = Drum;
Drum.prototype.bang = function bang () {
	var node = this.context.createBufferSource();
	node.buffer = this.buffer;
	node.connect( this.context.destination );
	node.start( 0 );
}

var snare = new Drum( 'assets/707/707CLAP.WAV', context )
console.log( snare );


// list sounds, then load and play them
var drums = {
	'clap'  : { grid: 1, path: 'assets/707/707CLAP.WAV', buffer: undefined },
	'cowbl' : { grid: 2, path: 'assets/707/707COWBL.WAV', buffer: undefined },
	'htm'   : { grid: 3, path: 'assets/707/707HTM.WAV', buffer: undefined },
	'ltm'   : { grid: 4, path: 'assets/707/707LTM.WAV', buffer: undefined },
	'mtm'   : { grid: 5, path: 'assets/707/707MTM.WAV', buffer: undefined },
	'rimsh' : { grid: 6, path: 'assets/707/707RIMSH.WAV', buffer: undefined },
	'tambo' : { grid: 7, path: 'assets/707/707TAMBO.WAV', buffer: undefined }
};

for( drum in drums ) { if( drums.hasOwnProperty( drum ) ){
	loadSound( drums[drum].path );
}}



//
// Sequencer
//

var sequence = [];
var seqMaxLen = 16;
var currentStep = 0;
var nextTimer; 	// will hold the timeout id for the next step, so the sequencer can be stopped.
var playing = false;
var tempo = 120;
var division = 4;	// as in 4 1/16th-notes per beat.


sequence.push(['tambo', 'mtm', 'cowbl']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push([]);
sequence.push(['tambo', 'clap']);
sequence.push([]);
sequence.push(['tambo', 'mtm']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push([]);
sequence.push(['tambo', 'mtm']);
sequence.push([]);
sequence.push(['tambo', 'clap']);
sequence.push([]);
sequence.push(['tambo']);
sequence.push(['rimsh']);

console.log(sequence)

function playStep ( stepIndex ) {
	var hits = sequence[ stepIndex ];
	var hitCount = hits.length;

	currentStep = ++currentStep % seqMaxLen;

	while( hitCount-- ) {
		bang( drums[ hits[ hitCount ] ] );
	}

	if( playing ) {
		nextTimer = setTimeout( playStep, interval, currentStep );
	}
}

function toggleStartStop () {
	if( playing ) {
		playing = false;
		clearTimeout( nextTimer );
	} else {
		playing = true;
		startSequence();
	}
}

function startSequence () {
	interval = (60 / (tempo * division)) * 1000;
	playStep( currentStep );
}


//
// Interface (event handling)
// - this could probably become a kind of master object, or controller
//

var mousedown = false;

function handleKeys ( event ) {
	switch( event.which ) {
	case 32:
		toggleStartStop();
		break;
 	}
}

function handlePadHit ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();
	// event.stopPropagation();
	bang( drums[ event.target.id ] );

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
$(document).on('mousedown', function toggleMouseDownTrue () { mousedown = true; } );
$(document).on('mouseup', function toggleMouseDownFalse () { mousedown = false; } );

// delegate drum pad taps to padgrid
$(document).on('keydown', handleKeys );
$('#padgrid').on('touchstart', 'button', handlePadHit );
$('#padgrid').on('mousedown', 'button', handlePadHit );
$('#padgrid').on('mouseenter', 'button', function ( event ) {
	if( mousedown ) { handlePadHit( event ); }
});


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG4vLyBBbiBleHBlcmltZW50IGJvcnJvd2luZyBoZWF2aWx5IGZyb20gaFRNTDVSb2Nrc1xuLy8gaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvd2ViYXVkaW8vaW50cm8vXG4vL1xuLy8gQSBkcnVtLW1hY2hpbmUgd2l0aCBiYXNpYyBzZXF1ZW5jZXIgdG8gZ2V0IGEgZmVlbCBmb3IgbGF1bmNoaW5nIGFuZFxuLy8gIG1peGluZyBzb3VuZHMsIHN0cmluZ2luZyB0aGVtIHRvZ2V0aGVyIGluIHRpbWUsIGJ1aWxkaW5nIGFuIGFwcCByYXRoZXIgdGhhblxuLy8gIGEgZG9jdW1lbnQgKGJlY2F1c2UgSSB1c3VhbGx5IG1ha2UgZG9jdW1lbnRzIGZvciBteSBkYXktam9iLCBldmVuIHdoZW4gdGhleSdyZSBtYWRlXG4vLyAgbGlrZSBhIFNQQSkuIFBvdGVudGlhbGx5LCB0aGlzIHByb2plY3QgY291bGQgYmUgdXNlZCB0byBsZWFybiBhYm91dCBGUlAsIGFzIHdlbGwsXG4vLyAgYXMgdGhlIGludGVyZmFjZSBpcyBjcnlpbmcgb3V0IGZvciBiZXR0ZXIgY29kZSBhZXN0aGVzdGljcywgYnV0IHRoaXMgaXMgZm9yIGFcbi8vICBsYXRlciBzdGFnZS5cblxuXG4vLyBBdm9pZCB0aGUgYXBwIGFkZGluZyBnbG9iYWxzIHdpdGggYW4gSUlGRVxuLy8gaHR0cDovL2JlbmFsbWFuLmNvbS9uZXdzLzIwMTAvMTEvaW1tZWRpYXRlbHktaW52b2tlZC1mdW5jdGlvbi1leHByZXNzaW9uL1xuLy8gaHR0cDovL3d3dy5hZGVxdWF0ZWx5Z29vZC5jb20vSmF2YVNjcmlwdC1Nb2R1bGUtUGF0dGVybi1Jbi1EZXB0aC5odG1sXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxuXG5cblxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vL1xuLy8gSGVscGVyIG9iamVjdHNcbi8vXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qKlxuICogRXZlbnRlZFxuICogYWRkcyBldmVudCBoYW5kbGluZyB0byBvYmplY3RzLCBkZWxlZ2F0aW5nIHRvICRcbiAqL1xuZnVuY3Rpb24gRXZlbnRlZCAoKSB7fVxuRXZlbnRlZC5wcm90b3R5cGUgPSB7XG5cdGNvbnN0cnVjdG9yOiBFdmVudGVkLFxuXHRvbjogZnVuY3Rpb24gKCBldmVudE5hbWUsIGNhbGxiYWNrICkgeyAkKHRoaXMpLm9uKCBldmVudE5hbWUsIGNhbGxiYWNrICk7IHJldHVybiB0aGlzOyB9LFxuXHRvZmY6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS5vZmYoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTsgcmV0dXJuIHRoaXM7IH0sXG5cdHRyaWdnZXI6IGZ1bmN0aW9uICggZXZlbnROYW1lLCBjYWxsYmFjayApIHsgJCh0aGlzKS50cmlnZ2VyKCBldmVudE5hbWUgKTsgcmV0dXJuIHRoaXM7IH1cbn1cblxuXG5cblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy9cbi8vIFRoZSAnc3ludGgnIHNlY3Rpb25cbi8vIGRydW0gc291bmRzLCBjaGFubmVsIHRvIHBsYXkgdGhlbSB0aHJvdWdoLCBsb2FkZXIgdG8gbG9hZCB0aGVtIGV0Y1xuLy9cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuXG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxudmFyIG1hdGNoRHJ1bUlEID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2k7XG5cbmZ1bmN0aW9uIGxvYWRTb3VuZCggc291bmRVcmwgKSB7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIGlkID0gbWF0Y2hEcnVtSUQuZXhlYyggc291bmRVcmwgKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRkcnVtc1sgaWQgXS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRiYW5nKCBkcnVtc1sgaWQgXSApO1xuXHRcdH0pO1xuXG5cdFx0bWF0Y2hEcnVtSUQubGFzdEluZGV4ID0gMDtcblx0fTtcblxuXHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNvdW5kVXJsLCB0cnVlKTtcblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cblxuZnVuY3Rpb24gYmFuZyggZHJ1bSApIHtcblx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7IC8vIGNyZWF0ZXMgYSBzb3VuZCBzb3VyY2VcblxuXHRzb3VyY2UuYnVmZmVyID0gZHJ1bS5idWZmZXI7ICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG59XG5cblxuXG5cbi8qKlxuICogQGNsYXNzIERydW1cbiAqIEBleHRlbmRzIEV2ZW50ZWRcbiAqIGhhbmRsZXMgbG9hZGluZyAmIGRlY29kaW5nIHNhbXBsZXMsIGFuZCBhdHRhY2hpbmcgdG8gdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmZ1bmN0aW9uIERydW0gKCBwYXRoLCBjb250ZXh0ICkge1xuXHR0aGlzLnBhdGggPSBwYXRoO1xuXHR0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xufVxuRHJ1bS5wcm90b3R5cGUgPSBuZXcgRXZlbnRlZCgpO1xuRHJ1bS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEcnVtO1xuRHJ1bS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uIGJhbmcgKCkge1xuXHR2YXIgbm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblx0bm9kZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcblx0bm9kZS5jb25uZWN0KCB0aGlzLmNvbnRleHQuZGVzdGluYXRpb24gKTtcblx0bm9kZS5zdGFydCggMCApO1xufVxuXG52YXIgc25hcmUgPSBuZXcgRHJ1bSggJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLCBjb250ZXh0IClcbmNvbnNvbGUubG9nKCBzbmFyZSApO1xuXG5cbi8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxudmFyIGRydW1zID0ge1xuXHQnY2xhcCcgIDogeyBncmlkOiAxLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdjb3dibCcgOiB7IGdyaWQ6IDIsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdodG0nICAgOiB7IGdyaWQ6IDMsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnbHRtJyAgIDogeyBncmlkOiA0LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J210bScgICA6IHsgZ3JpZDogNSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdyaW1zaCcgOiB7IGdyaWQ6IDYsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCd0YW1ibycgOiB7IGdyaWQ6IDcsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH1cbn07XG5cbmZvciggZHJ1bSBpbiBkcnVtcyApIHsgaWYoIGRydW1zLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0bG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG59fVxuXG5cblxuLy9cbi8vIFNlcXVlbmNlclxuLy9cblxudmFyIHNlcXVlbmNlID0gW107XG52YXIgc2VxTWF4TGVuID0gMTY7XG52YXIgY3VycmVudFN0ZXAgPSAwO1xudmFyIG5leHRUaW1lcjsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG52YXIgcGxheWluZyA9IGZhbHNlO1xudmFyIHRlbXBvID0gMTIwO1xudmFyIGRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxuXG5cbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nLCAnY293YmwnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ2NsYXAnXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibyddKTtcbnNlcXVlbmNlLnB1c2goWydyaW1zaCddKTtcblxuY29uc29sZS5sb2coc2VxdWVuY2UpXG5cbmZ1bmN0aW9uIHBsYXlTdGVwICggc3RlcEluZGV4ICkge1xuXHR2YXIgaGl0cyA9IHNlcXVlbmNlWyBzdGVwSW5kZXggXTtcblx0dmFyIGhpdENvdW50ID0gaGl0cy5sZW5ndGg7XG5cblx0Y3VycmVudFN0ZXAgPSArK2N1cnJlbnRTdGVwICUgc2VxTWF4TGVuO1xuXG5cdHdoaWxlKCBoaXRDb3VudC0tICkge1xuXHRcdGJhbmcoIGRydW1zWyBoaXRzWyBoaXRDb3VudCBdIF0gKTtcblx0fVxuXG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdG5leHRUaW1lciA9IHNldFRpbWVvdXQoIHBsYXlTdGVwLCBpbnRlcnZhbCwgY3VycmVudFN0ZXAgKTtcblx0fVxufVxuXG5mdW5jdGlvbiB0b2dnbGVTdGFydFN0b3AgKCkge1xuXHRpZiggcGxheWluZyApIHtcblx0XHRwbGF5aW5nID0gZmFsc2U7XG5cdFx0Y2xlYXJUaW1lb3V0KCBuZXh0VGltZXIgKTtcblx0fSBlbHNlIHtcblx0XHRwbGF5aW5nID0gdHJ1ZTtcblx0XHRzdGFydFNlcXVlbmNlKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RhcnRTZXF1ZW5jZSAoKSB7XG5cdGludGVydmFsID0gKDYwIC8gKHRlbXBvICogZGl2aXNpb24pKSAqIDEwMDA7XG5cdHBsYXlTdGVwKCBjdXJyZW50U3RlcCApO1xufVxuXG5cbi8vXG4vLyBJbnRlcmZhY2UgKGV2ZW50IGhhbmRsaW5nKVxuLy8gLSB0aGlzIGNvdWxkIHByb2JhYmx5IGJlY29tZSBhIGtpbmQgb2YgbWFzdGVyIG9iamVjdCwgb3IgY29udHJvbGxlclxuLy9cblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG5mdW5jdGlvbiBoYW5kbGVLZXlzICggZXZlbnQgKSB7XG5cdHN3aXRjaCggZXZlbnQud2hpY2ggKSB7XG5cdGNhc2UgMzI6XG5cdFx0dG9nZ2xlU3RhcnRTdG9wKCk7XG5cdFx0YnJlYWs7XG4gXHR9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVBhZEhpdCAoIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0Ly8gZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGJhbmcoIGRydW1zWyBldmVudC50YXJnZXQuaWQgXSApO1xuXG5cdC8vIGJsdXIgaWYgY2xpY2tlZCAoYnV0IGRvZXNuJ3QgYWN0dWFsbHkgd29yaylcblx0aWYoIC9tb3VzZS8udGVzdCggZXZlbnQudHlwZSApICkgZXZlbnQudGFyZ2V0LmJsdXIoKTtcbn1cblxuLy8gdG9nZ2xlIG1vdXNlZG93biBmbGFnLCB1c2VkIGZvciBkcmFnZ2luZyBhbiAnYWN0aXZlXCIgbW91c2Ugb3ZlciBtYWNoaW5lIGNvbnRyb2xzXG4kKGRvY3VtZW50KS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duVHJ1ZSAoKSB7IG1vdXNlZG93biA9IHRydWU7IH0gKTtcbiQoZG9jdW1lbnQpLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gdG9nZ2xlTW91c2VEb3duRmFsc2UgKCkgeyBtb3VzZWRvd24gPSBmYWxzZTsgfSApO1xuXG4vLyBkZWxlZ2F0ZSBkcnVtIHBhZCB0YXBzIHRvIHBhZGdyaWRcbiQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgaGFuZGxlS2V5cyApO1xuJCgnI3BhZGdyaWQnKS5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZG93bicsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG59KTtcblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=