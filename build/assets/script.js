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
console.log( event.which );
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gV2ViIEF1ZGlvIDEwMVxuLy8gQW4gZXhwZXJpbWVudCBib3Jyb3dpbmcgaGVhdmlseSBmcm9tIGhUTUw1Um9ja3Ncbi8vIGh0dHA6Ly93d3cuaHRtbDVyb2Nrcy5jb20vZW4vdHV0b3JpYWxzL3dlYmF1ZGlvL2ludHJvL1xuLy9cbi8vIEEgZHJ1bS1tYWNoaW5lIHdpdGggYmFzaWMgc2VxdWVuY2VyIHRvIGdldCBhIGZlZWwgZm9yIGxhdW5jaGluZyBhbmRcbi8vICBtaXhpbmcgc291bmRzLCBzdHJpbmdpbmcgdGhlbSB0b2dldGhlciBpbiB0aW1lLCBidWlsZGluZyBhbiBhcHAgcmF0aGVyIHRoYW5cbi8vICBhIGRvY3VtZW50IChiZWNhdXNlIEkgdXN1YWxseSBtYWtlIGRvY3VtZW50cyBmb3IgbXkgZGF5LWpvYiwgZXZlbiB3aGVuIHRoZXkncmUgbWFkZVxuLy8gIGxpa2UgYSBTUEEpLiBQb3RlbnRpYWxseSwgdGhpcyBwcm9qZWN0IGNvdWxkIGJlIHVzZWQgdG8gbGVhcm4gYWJvdXQgRlJQLCBhcyB3ZWxsLFxuLy8gIGFzIHRoZSBpbnRlcmZhY2UgaXMgY3J5aW5nIG91dCBmb3IgYmV0dGVyIGNvZGUgYWVzdGhlc3RpY3MsIGJ1dCB0aGlzIGlzIGZvciBhXG4vLyAgbGF0ZXIgc3RhZ2UuXG5cblxuLy8gQXZvaWQgdGhlIGFwcCBhZGRpbmcgZ2xvYmFscyB3aXRoIGFuIElJRkVcbi8vIGh0dHA6Ly9iZW5hbG1hbi5jb20vbmV3cy8yMDEwLzExL2ltbWVkaWF0ZWx5LWludm9rZWQtZnVuY3Rpb24tZXhwcmVzc2lvbi9cbi8vIGh0dHA6Ly93d3cuYWRlcXVhdGVseWdvb2QuY29tL0phdmFTY3JpcHQtTW9kdWxlLVBhdHRlcm4tSW4tRGVwdGguaHRtbFxuKGZ1bmN0aW9uICh3aW5kb3csICQpe1xuXG4vLyBGaXggdXAgcHJlZml4aW5nXG53aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuXG4vLyBhcHAgbmFtZXNwYWNlXG52YXIgZHJ1bU1hY2hpbmUgPSB7fVxudmFyIGRtID0gZHJ1bU1hY2hpbmU7XG5cblxuLy9cbi8vIHRoZSBcInN5bnRoXCJcbi8vIGRydW0gc291bmRzLCBjaGFubmVsIHRvIHBsYXkgdGhlbSB0aHJvdWdoLCBsb2FkZXIgdG8gbG9hZCB0aGVtIGV0Y1xuLy9cblxuZG0uc3ludGggPSB7fVxuXG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxudmFyIG1hdGNoRHJ1bUlEID0gLyg/OlxcLzcwNykoXFx3KykoPzpcXC4pL2k7XG5cbmZ1bmN0aW9uIGxvYWRTb3VuZCggc291bmRVcmwgKSB7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuXHQvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHlcblx0cmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiBoYW5kbGVMb2FkU291bmQgKCBldmVudCApIHtcblx0XHRpZiggZXZlbnQudHlwZSAhPT0gJ2xvYWQnICkgcmV0dXJuO1xuXHRcdHZhciB4aHIgPSBldmVudC50YXJnZXQ7XG5cdFx0dmFyIGlkID0gbWF0Y2hEcnVtSUQuZXhlYyggc291bmRVcmwgKVsxXS50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0Y29udGV4dC5kZWNvZGVBdWRpb0RhdGEoIHhoci5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRkcnVtc1sgaWQgXS5idWZmZXIgPSBidWZmZXI7XG5cdFx0XHRiYW5nKCBkcnVtc1sgaWQgXSApO1xuXHRcdH0pO1xuXG5cdFx0bWF0Y2hEcnVtSUQubGFzdEluZGV4ID0gMDtcblx0fTtcblxuXHRyZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNvdW5kVXJsLCB0cnVlKTtcblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cblxuZnVuY3Rpb24gYmFuZyggZHJ1bSApIHtcblx0dmFyIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7IC8vIGNyZWF0ZXMgYSBzb3VuZCBzb3VyY2VcblxuXHRzb3VyY2UuYnVmZmVyID0gZHJ1bS5idWZmZXI7ICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG59XG5cbmRtLnN5bnRoLmJhbmcgPSBiYW5nO1xuXG5cbi8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxudmFyIGRydW1zID0ge1xuXHQnY2xhcCcgIDogeyBncmlkOiAxLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDTEFQLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J2Nvd2JsJyA6IHsgZ3JpZDogMiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q09XQkwuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQnaHRtJyAgIDogeyBncmlkOiAzLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdIVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQnbHRtJyAgIDogeyBncmlkOiA0LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdMVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQnbXRtJyAgIDogeyBncmlkOiA1LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdNVE0uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQncmltc2gnIDogeyBncmlkOiA2LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdSSU1TSC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCd0YW1ibycgOiB7IGdyaWQ6IDcsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1RBTUJPLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfVxufTtcblxuZG0uc3ludGguZHJ1bXMgPSBkcnVtcztcblxuZm9yKCBkcnVtIGluIGRydW1zICkgeyBpZiggZHJ1bXMuaGFzT3duUHJvcGVydHkoIGRydW0gKSApe1xuXHRkcnVtc1tkcnVtXS5zb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcblx0bG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoLCBmdW5jdGlvbiBvbmxvYWRIYW5kbGVyICgpIHsgY29uc29sZS5sb2coJ29ubG9hZCcsIGFyZ3VtZW50cyk7IH0gKTtcbn19XG5cblxuXG4vL1xuLy8gU2VxdWVuY2VyXG4vL1xuXG52YXIgc2VxdWVuY2UgPSBbXTtcbnZhciBzZXFNYXhMZW4gPSAxNjtcbnZhciBjdXJyZW50U3RlcCA9IDA7XG52YXIgbmV4dFRpbWVyOyBcdC8vIHdpbGwgaG9sZCB0aGUgdGltZW91dCBpZCBmb3IgdGhlIG5leHQgc3RlcCwgc28gdGhlIHNlcXVlbmNlciBjYW4gYmUgc3RvcHBlZC5cbnZhciBwbGF5aW5nID0gZmFsc2U7XG52YXIgdGVtcG8gPSAxMjA7XG52YXIgZGl2aXNpb24gPSA0O1x0Ly8gYXMgaW4gNCAxLzE2dGgtbm90ZXMgcGVyIGJlYXQuXG5cblxuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bScsICdjb3dibCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJywgJ210bSddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnY2xhcCddKTtcbnNlcXVlbmNlLnB1c2goW10pO1xuc2VxdWVuY2UucHVzaChbJ3RhbWJvJ10pO1xuc2VxdWVuY2UucHVzaChbJ3JpbXNoJ10pO1xuXG5jb25zb2xlLmxvZyhzZXF1ZW5jZSlcblxuZnVuY3Rpb24gcGxheVN0ZXAgKCBzdGVwSW5kZXggKSB7XG5cdHZhciBoaXRzID0gc2VxdWVuY2VbIHN0ZXBJbmRleCBdO1xuXHR2YXIgaGl0Q291bnQgPSBoaXRzLmxlbmd0aDtcblxuXHRjdXJyZW50U3RlcCA9ICsrY3VycmVudFN0ZXAgJSBzZXFNYXhMZW47XG5cblx0d2hpbGUoIGhpdENvdW50LS0gKSB7XG5cdFx0YmFuZyggZHJ1bXNbIGhpdHNbIGhpdENvdW50IF0gXSApO1xuXHR9XG5cblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0bmV4dFRpbWVyID0gc2V0VGltZW91dCggcGxheVN0ZXAsIGludGVydmFsLCBjdXJyZW50U3RlcCApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVN0YXJ0U3RvcCAoKSB7XG5cdGlmKCBwbGF5aW5nICkge1xuXHRcdHBsYXlpbmcgPSBmYWxzZTtcblx0XHRjbGVhclRpbWVvdXQoIG5leHRUaW1lciApO1xuXHR9IGVsc2Uge1xuXHRcdHBsYXlpbmcgPSB0cnVlO1xuXHRcdHN0YXJ0U2VxdWVuY2UoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydFNlcXVlbmNlICgpIHtcblx0aW50ZXJ2YWwgPSAoNjAgLyAodGVtcG8gKiBkaXZpc2lvbikpICogMTAwMDtcblx0cGxheVN0ZXAoIGN1cnJlbnRTdGVwICk7XG59XG5cblxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcbmNvbnNvbGUubG9nKCBldmVudC53aGljaCApO1xuXHRzd2l0Y2goIGV2ZW50LndoaWNoICkge1xuXHRjYXNlIDMyOlxuXHRcdHRvZ2dsZVN0YXJ0U3RvcCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdC8vIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRkbS5zeW50aC5iYW5nKCBkbS5zeW50aC5kcnVtc1sgZXZlbnQudGFyZ2V0LmlkIF0gKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbi8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuJChkb2N1bWVudCkub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG4kKGRvY3VtZW50KS5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuLy8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG4kKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcbiQoJyNwYWRncmlkJykub24oJ3RvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWRvd24nLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxufSk7XG5cblxufSh3aW5kb3csICQpKTtcbi8vIGVuZCBhbnRpLWdsb2JhbCBJSUZFIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9