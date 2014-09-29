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
		cancelTimeout( nextTimer );
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdlYiBBdWRpbyAxMDFcbi8vIEFuIGV4cGVyaW1lbnQgYm9ycm93aW5nIGhlYXZpbHkgZnJvbSBoVE1MNVJvY2tzXG4vLyBodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy93ZWJhdWRpby9pbnRyby9cbi8vXG4vLyBBIGRydW0tbWFjaGluZSB3aXRoIGJhc2ljIHNlcXVlbmNlciB0byBnZXQgYSBmZWVsIGZvciBsYXVuY2hpbmcgYW5kXG4vLyAgbWl4aW5nIHNvdW5kcywgc3RyaW5naW5nIHRoZW0gdG9nZXRoZXIgaW4gdGltZSwgYnVpbGRpbmcgYW4gYXBwIHJhdGhlciB0aGFuXG4vLyAgYSBkb2N1bWVudCAoYmVjYXVzZSBJIHVzdWFsbHkgbWFrZSBkb2N1bWVudHMgZm9yIG15IGRheS1qb2IsIGV2ZW4gd2hlbiB0aGV5J3JlIG1hZGVcbi8vICBsaWtlIGEgU1BBKS4gUG90ZW50aWFsbHksIHRoaXMgcHJvamVjdCBjb3VsZCBiZSB1c2VkIHRvIGxlYXJuIGFib3V0IEZSUCwgYXMgd2VsbCxcbi8vICBhcyB0aGUgaW50ZXJmYWNlIGlzIGNyeWluZyBvdXQgZm9yIGJldHRlciBjb2RlIGFlc3RoZXN0aWNzLCBidXQgdGhpcyBpcyBmb3IgYVxuLy8gIGxhdGVyIHN0YWdlLlxuXG5cbi8vIEF2b2lkIHRoZSBhcHAgYWRkaW5nIGdsb2JhbHMgd2l0aCBhbiBJSUZFXG4vLyBodHRwOi8vYmVuYWxtYW4uY29tL25ld3MvMjAxMC8xMS9pbW1lZGlhdGVseS1pbnZva2VkLWZ1bmN0aW9uLWV4cHJlc3Npb24vXG4vLyBodHRwOi8vd3d3LmFkZXF1YXRlbHlnb29kLmNvbS9KYXZhU2NyaXB0LU1vZHVsZS1QYXR0ZXJuLUluLURlcHRoLmh0bWxcbihmdW5jdGlvbiAod2luZG93LCAkKXtcblxuLy8gRml4IHVwIHByZWZpeGluZ1xud2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcblxuLy8gYXBwIG5hbWVzcGFjZVxudmFyIGRydW1NYWNoaW5lID0ge31cbnZhciBkbSA9IGRydW1NYWNoaW5lO1xuXG5cbi8vXG4vLyB0aGUgXCJzeW50aFwiXG4vLyBkcnVtIHNvdW5kcywgY2hhbm5lbCB0byBwbGF5IHRoZW0gdGhyb3VnaCwgbG9hZGVyIHRvIGxvYWQgdGhlbSBldGNcbi8vXG5cbmRtLnN5bnRoID0ge31cblxudmFyIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbnZhciBtYXRjaERydW1JRCA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pO1xuXG5mdW5jdGlvbiBsb2FkU291bmQoIHNvdW5kVXJsICkge1xuXHR2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRyZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cblx0Ly8gRGVjb2RlIGFzeW5jaHJvbm91c2x5XG5cdHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gaGFuZGxlTG9hZFNvdW5kICggZXZlbnQgKSB7XG5cdFx0aWYoIGV2ZW50LnR5cGUgIT09ICdsb2FkJyApIHJldHVybjtcblx0XHR2YXIgeGhyID0gZXZlbnQudGFyZ2V0O1xuXHRcdHZhciBpZCA9IG1hdGNoRHJ1bUlELmV4ZWMoIHNvdW5kVXJsIClbMV0udG9Mb3dlckNhc2UoKTtcblxuXHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKCB4aHIucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0ZHJ1bXNbIGlkIF0uYnVmZmVyID0gYnVmZmVyO1xuXHRcdFx0YmFuZyggZHJ1bXNbIGlkIF0gKTtcblx0XHR9KTtcblxuXHRcdG1hdGNoRHJ1bUlELmxhc3RJbmRleCA9IDA7XG5cdH07XG5cblx0cmVxdWVzdC5vcGVuKCdHRVQnLCBzb3VuZFVybCwgdHJ1ZSk7XG5cdHJlcXVlc3Quc2VuZCgpO1xufVxuXG5cbmZ1bmN0aW9uIGJhbmcoIGRydW0gKSB7XG5cdHZhciBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpOyAvLyBjcmVhdGVzIGEgc291bmQgc291cmNlXG5cblx0c291cmNlLmJ1ZmZlciA9IGRydW0uYnVmZmVyOyAgICAgICAgICAgICAgIC8vIHRlbGwgdGhlIHNvdXJjZSB3aGljaCBzb3VuZCB0byBwbGF5XG5cdHNvdXJjZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pOyAgICAgICAvLyBjb25uZWN0IHRoZSBzb3VyY2UgdG8gdGhlIGNvbnRleHQncyBkZXN0aW5hdGlvbiAodGhlIHNwZWFrZXJzKVxuXHRzb3VyY2Uuc3RhcnQoMCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxheSB0aGUgc291cmNlIG5vd1xufVxuXG5kbS5zeW50aC5iYW5nID0gYmFuZztcblxuXG4vLyBsaXN0IHNvdW5kcywgdGhlbiBsb2FkIGFuZCBwbGF5IHRoZW1cbnZhciBkcnVtcyA9IHtcblx0J2NsYXAnICA6IHsgZ3JpZDogMSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3Q0xBUC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCdjb3dibCcgOiB7IGdyaWQ6IDIsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NPV0JMLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J2h0bScgICA6IHsgZ3JpZDogMywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3SFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J2x0bScgICA6IHsgZ3JpZDogNCwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TFRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J210bScgICA6IHsgZ3JpZDogNSwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3TVRNLldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J3JpbXNoJyA6IHsgZ3JpZDogNiwgcGF0aDogJ2Fzc2V0cy83MDcvNzA3UklNU0guV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQndGFtYm8nIDogeyBncmlkOiA3LCBwYXRoOiAnYXNzZXRzLzcwNy83MDdUQU1CTy5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH1cbn07XG5cbmRtLnN5bnRoLmRydW1zID0gZHJ1bXM7XG5cbmZvciggZHJ1bSBpbiBkcnVtcyApIHsgaWYoIGRydW1zLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0ZHJ1bXNbZHJ1bV0uc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cdGxvYWRTb3VuZCggZHJ1bXNbZHJ1bV0ucGF0aCwgZnVuY3Rpb24gb25sb2FkSGFuZGxlciAoKSB7IGNvbnNvbGUubG9nKCdvbmxvYWQnLCBhcmd1bWVudHMpOyB9ICk7XG59fVxuXG5cblxuLy9cbi8vIFNlcXVlbmNlclxuLy9cblxudmFyIHNlcXVlbmNlID0gW107XG52YXIgc2VxTWF4TGVuID0gMTY7XG52YXIgY3VycmVudFN0ZXAgPSAwO1xudmFyIG5leHRUaW1lcjsgXHQvLyB3aWxsIGhvbGQgdGhlIHRpbWVvdXQgaWQgZm9yIHRoZSBuZXh0IHN0ZXAsIHNvIHRoZSBzZXF1ZW5jZXIgY2FuIGJlIHN0b3BwZWQuXG52YXIgcGxheWluZyA9IGZhbHNlO1xudmFyIHRlbXBvID0gMTIwO1xudmFyIGRpdmlzaW9uID0gNDtcdC8vIGFzIGluIDQgMS8xNnRoLW5vdGVzIHBlciBiZWF0LlxuXG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJywgJ2Nvd2JsJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nLCAnbXRtJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdtdG0nXSk7XG5zZXF1ZW5jZS5wdXNoKFtdKTtcbnNlcXVlbmNlLnB1c2goWyd0YW1ibycsICdjbGFwJ10pO1xuc2VxdWVuY2UucHVzaChbXSk7XG5zZXF1ZW5jZS5wdXNoKFsndGFtYm8nXSk7XG5zZXF1ZW5jZS5wdXNoKFsncmltc2gnXSk7XG5cbmNvbnNvbGUubG9nKHNlcXVlbmNlKVxuXG5mdW5jdGlvbiBwbGF5U3RlcCAoIHN0ZXBJbmRleCApIHtcblx0dmFyIGhpdHMgPSBzZXF1ZW5jZVsgc3RlcEluZGV4IF07XG5cdHZhciBoaXRDb3VudCA9IGhpdHMubGVuZ3RoO1xuXG5cdGN1cnJlbnRTdGVwID0gKytjdXJyZW50U3RlcCAlIHNlcU1heExlbjtcblxuXHR3aGlsZSggaGl0Q291bnQtLSApIHtcblx0XHRiYW5nKCBkcnVtc1sgaGl0c1sgaGl0Q291bnQgXSBdICk7XG5cdH1cblxuXHRpZiggcGxheWluZyApIHtcblx0XHRuZXh0VGltZXIgPSBzZXRUaW1lb3V0KCBwbGF5U3RlcCwgaW50ZXJ2YWwsIGN1cnJlbnRTdGVwICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdG9nZ2xlU3RhcnRTdG9wICgpIHtcblx0aWYoIHBsYXlpbmcgKSB7XG5cdFx0cGxheWluZyA9IGZhbHNlO1xuXHRcdGNhbmNlbFRpbWVvdXQoIG5leHRUaW1lciApO1xuXHR9IGVsc2Uge1xuXHRcdHBsYXlpbmcgPSB0cnVlO1xuXHRcdHN0YXJ0U2VxdWVuY2UoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzdGFydFNlcXVlbmNlICgpIHtcblx0aW50ZXJ2YWwgPSAoNjAgLyAodGVtcG8gKiBkaXZpc2lvbikpICogMTAwMDtcblx0cGxheVN0ZXAoIGN1cnJlbnRTdGVwICk7XG59XG5cblxuLy9cbi8vIEludGVyZmFjZSAoZXZlbnQgaGFuZGxpbmcpXG4vLyAtIHRoaXMgY291bGQgcHJvYmFibHkgYmVjb21lIGEga2luZCBvZiBtYXN0ZXIgb2JqZWN0LCBvciBjb250cm9sbGVyXG4vL1xuXG52YXIgbW91c2Vkb3duID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGhhbmRsZUtleXMgKCBldmVudCApIHtcbmNvbnNvbGUubG9nKCBldmVudC53aGljaCApO1xuXHRzd2l0Y2goIGV2ZW50LndoaWNoICkge1xuXHRjYXNlIDMyOlxuXHRcdHRvZ2dsZVN0YXJ0U3RvcCgpO1xuXHRcdGJyZWFrO1xuIFx0fVxufVxuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdC8vIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRkbS5zeW50aC5iYW5nKCBkbS5zeW50aC5kcnVtc1sgZXZlbnQudGFyZ2V0LmlkIF0gKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbi8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuJChkb2N1bWVudCkub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG4kKGRvY3VtZW50KS5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuLy8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG4kKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZUtleXMgKTtcbiQoJyNwYWRncmlkJykub24oJ3RvdWNoc3RhcnQnLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWRvd24nLCAnYnV0dG9uJywgaGFuZGxlUGFkSGl0ICk7XG4kKCcjcGFkZ3JpZCcpLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZVBhZEhpdCggZXZlbnQgKTsgfVxufSk7XG5cblxufSh3aW5kb3csICQpKTtcbi8vIGVuZCBhbnRpLWdsb2JhbCBJSUZFIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9