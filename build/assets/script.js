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
	'clap'  : { grid: 1, path: 'assets/707/707CLAP.WAV', buffer: undefined },
	'cowbl' : { grid: 2, path: 'assets/707/707COWBL.WAV', buffer: undefined },
	'htm'   : { grid: 3, path: 'assets/707/707HTM.WAV', buffer: undefined },
	'ltm'   : { grid: 4, path: 'assets/707/707LTM.WAV', buffer: undefined },
	'mtm'   : { grid: 5, path: 'assets/707/707MTM.WAV', buffer: undefined },
	'rimsh' : { grid: 6, path: 'assets/707/707RIMSH.WAV', buffer: undefined },
	'tambo' : { grid: 7, path: 'assets/707/707TAMBO.WAV', buffer: undefined }
};

dm.synth.drums = drums;

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
	dm.synth.bang( dm.synth.drums[ event.target.id ] );

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG4vLyBBbiBleHBlcmltZW50IGJvcnJvd2luZyBoZWF2aWx5IGZyb20gaFRNTDVSb2Nrc1xuLy8gaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvd2ViYXVkaW8vaW50cm8vXG4vL1xuLy8gQSBkcnVtLW1hY2hpbmUgd2l0aCBiYXNpYyBzZXF1ZW5jZXIgdG8gZ2V0IGEgZmVlbCBmb3IgbGF1bmNoaW5nIGFuZFxuLy8gIG1peGluZyBzb3VuZHMsIHN0cmluZ2luZyB0aGVtIHRvZ2V0aGVyIGluIHRpbWUsIGJ1aWxkaW5nIGFuIGFwcCByYXRoZXIgdGhhblxuLy8gIGEgZG9jdW1lbnQgKGJlY2F1c2UgSSB1c3VhbGx5IG1ha2UgZG9jdW1lbnRzIGZvciBteSBkYXktam9iLCBldmVuIHdoZW4gdGhleSdyZSBtYWRlXG4vLyAgbGlrZSBhIFNQQSkuIFBvdGVudGlhbGx5LCB0aGlzIHByb2plY3QgY291bGQgYmUgdXNlZCB0byBsZWFybiBhYm91dCBGUlAsIGFzIHdlbGwsXG4vLyAgYXMgdGhlIGludGVyZmFjZSBpcyBjcnlpbmcgb3V0IGZvciBiZXR0ZXIgY29kZSBhZXN0aGVzdGljcywgYnV0IHRoaXMgaXMgZm9yIGFcbi8vICBsYXRlciBzdGFnZS5cblxuXG4vLyBBdm9pZCB0aGUgYXBwIGFkZGluZyBnbG9iYWxzIHdpdGggYW4gSUlGRVxuLy8gaHR0cDovL2JlbmFsbWFuLmNvbS9uZXdzLzIwMTAvMTEvaW1tZWRpYXRlbHktaW52b2tlZC1mdW5jdGlvbi1leHByZXNzaW9uL1xuLy8gaHR0cDovL3d3dy5hZGVxdWF0ZWx5Z29vZC5jb20vSmF2YVNjcmlwdC1Nb2R1bGUtUGF0dGVybi1Jbi1EZXB0aC5odG1sXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbi8vIGFwcCBuYW1lc3BhY2VcbnZhciBkcnVtTWFjaGluZSA9IHt9XG52YXIgZG0gPSBkcnVtTWFjaGluZTtcblxuXG4vL1xuLy8gdGhlIFwic3ludGhcIlxuLy8gZHJ1bSBzb3VuZHMsIGNoYW5uZWwgdG8gcGxheSB0aGVtIHRocm91Z2gsIGxvYWRlciB0byBsb2FkIHRoZW0gZXRjXG4vL1xuXG5kbS5zeW50aCA9IHt9XG5cbnZhciBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXG52YXIgbWF0Y2hEcnVtSUQgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaTtcblxuZnVuY3Rpb24gbG9hZFNvdW5kKCBzb3VuZFVybCApIHtcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdC8vIERlY29kZSBhc3luY2hyb25vdXNseVxuXHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0dmFyIHhociA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgaWQgPSBtYXRjaERydW1JRC5leGVjKCBzb3VuZFVybCApWzFdLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdGRydW1zWyBpZCBdLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdGJhbmcoIGRydW1zWyBpZCBdICk7XG5cdFx0fSk7XG5cblx0XHRtYXRjaERydW1JRC5sYXN0SW5kZXggPSAwO1xuXHR9O1xuXG5cdHJlcXVlc3Qub3BlbignR0VUJywgc291bmRVcmwsIHRydWUpO1xuXHRyZXF1ZXN0LnNlbmQoKTtcbn1cblxuXG5mdW5jdGlvbiBiYW5nKCBkcnVtICkge1xuXHR2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTsgLy8gY3JlYXRlcyBhIHNvdW5kIHNvdXJjZVxuXG5cdHNvdXJjZS5idWZmZXIgPSBkcnVtLmJ1ZmZlcjsgICAgICAgICAgICAgICAvLyB0ZWxsIHRoZSBzb3VyY2Ugd2hpY2ggc291bmQgdG8gcGxheVxuXHRzb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTsgICAgICAgLy8gY29ubmVjdCB0aGUgc291cmNlIHRvIHRoZSBjb250ZXh0J3MgZGVzdGluYXRpb24gKHRoZSBzcGVha2Vycylcblx0c291cmNlLnN0YXJ0KDApOyAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYXkgdGhlIHNvdXJjZSBub3dcbn1cblxuZG0uc3ludGguYmFuZyA9IGJhbmc7XG5cblxuLy8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG52YXIgZHJ1bXMgPSB7XG5cdCdjbGFwJyAgOiB7IGdyaWQ6IDEsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2Nvd2JsJyA6IHsgZ3JpZDogMiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J2h0bScgICA6IHsgZ3JpZDogMywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkIH0sXG5cdCdsdG0nICAgOiB7IGdyaWQ6IDQsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCB9LFxuXHQnbXRtJyAgIDogeyBncmlkOiA1LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J3JpbXNoJyA6IHsgZ3JpZDogNiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfSxcblx0J3RhbWJvJyA6IHsgZ3JpZDogNywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQgfVxufTtcblxuZG0uc3ludGguZHJ1bXMgPSBkcnVtcztcblxuZm9yKCBkcnVtIGluIGRydW1zICkgeyBpZiggZHJ1bXMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHRsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGggKTtcbn19XG5cblxuXG4vL1xuLy8gU2VxdWVuY2VyXG4vL1xuXG52YXIgc2VxdWVuY2UgPSBbXTtcbnZhciBzZXFNYXhMZW4gPSAxNjtcbnZhciBjdXJyZW50U3RlcCA9IDA7XG52YXIgbmV4dFRpbWVyOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cbnZhciBwbGF5aW5nID0gZmFsc2U7XG52YXIgdGVtcG8gPSAxMjA7XG52YXIgZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblxuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5jb25zb2xlLmxvZyhzZXF1ZW5jZSlcblxuZnVuY3Rpb24gcGxheVN0ZXAgKCBzdGVwSW5kZXggKSB7XG5cdHZhciBoaXRzID0gc2VxdWVuY2VbIHN0ZXBJbmRleCBdO1xuXHR2YXIgaGl0Q291bnQgPSBoaXRzLmxlbmd0aDtcblxuXHRjdXJyZW50U3RlcCA9ICsrY3VycmVudFN0ZXAgJSBzZXFNYXhMZW47XG5cblx0d2hpbGUoIGhpdENvdW50LS0gKSB7XG5cdFx0YmFuZyggZHJ1bXNbIGhpdHNbIGhpdENvdW50IF0gXSApO1xuXHR9XG5cblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0bmV4dFRpbWVyID0gc2V0VGltZW91dCggcGxheVN0ZXAsIGludGVydmFsLCBjdXJyZW50U3RlcCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVN0YXJ0U3RvcCAoKSB7XG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdHBsYXlpbmcgPSBmYWxzZTtcblx0XHRjbGVhclRpbWVvdXQoIG5leHRUaW1lciApO1xuXHR9IGVsc2Uge1xuXHRcdHBsYXlpbmcgPSB0cnVlO1xuXHRcdHN0YXJ0U2VxdWVuY2UoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydFNlcXVlbmNlICgpIHtcblx0aW50ZXJ2YWwgPSAoNjAgLyAodGVtcG8gKiBkaXZpc2lvbikpICogMTAwMDtcblx0cGxheVN0ZXAoIGN1cnJlbnRTdGVwICk7XG59XG5cblxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcblx0c3dpdGNoKCBldmVudC53aGljaCApIHtcblx0Y2FzZSAzMjpcblx0XHR0b2dnbGVTdGFydFN0b3AoKTtcblx0XHRicmVhaztcbiBcdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlUGFkSGl0ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHQvLyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0ZG0uc3ludGguYmFuZyggZG0uc3ludGguZHJ1bXNbIGV2ZW50LnRhcmdldC5pZCBdICk7XG5cblx0Ly8gYmx1ciBpZiBjbGlja2VkIChidXQgZG9lc24ndCBhY3R1YWxseSB3b3JrKVxuXHRpZiggL21vdXNlLy50ZXN0KCBldmVudC50eXBlICkgKSBldmVudC50YXJnZXQuYmx1cigpO1xufVxuXG4vLyB0b2dnbGUgbW91c2Vkb3duIGZsYWcsIHVzZWQgZm9yIGRyYWdnaW5nIGFuICdhY3RpdmVcIiBtb3VzZSBvdmVyIG1hY2hpbmUgY29udHJvbHNcbiQoZG9jdW1lbnQpLm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbiB0b2dnbGVNb3VzZURvd25UcnVlICgpIHsgbW91c2Vkb3duID0gdHJ1ZTsgfSApO1xuJChkb2N1bWVudCkub24oJ21vdXNldXAnLCBmdW5jdGlvbiB0b2dnbGVNb3VzZURvd25GYWxzZSAoKSB7IG1vdXNlZG93biA9IGZhbHNlOyB9ICk7XG5cbi8vIGRlbGVnYXRlIGRydW0gcGFkIHRhcHMgdG8gcGFkZ3JpZFxuJChkb2N1bWVudCkub24oJ2tleWRvd24nLCBoYW5kbGVLZXlzICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCd0b3VjaHN0YXJ0JywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xuJCgnI3BhZGdyaWQnKS5vbignbW91c2Vkb3duJywgJ2J1dHRvbicsIGhhbmRsZVBhZEhpdCApO1xuJCgnI3BhZGdyaWQnKS5vbignbW91c2VlbnRlcicsICdidXR0b24nLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRpZiggbW91c2Vkb3duICkgeyBoYW5kbGVQYWRIaXQoIGV2ZW50ICk7IH1cbn0pO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==