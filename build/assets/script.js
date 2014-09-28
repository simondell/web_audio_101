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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZWIgQXVkaW8gMTAxXG4vLyBBbiBleHBlcmltZW50IGJvcnJvd2luZyBoZWF2aWx5IGZyb20gaFRNTDVSb2Nrc1xuLy8gaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvd2ViYXVkaW8vaW50cm8vXG4vL1xuLy8gQSBkcnVtLW1hY2hpbmUgd2l0aCBiYXNpYyBzZXF1ZW5jZXIgdG8gZ2V0IGEgZmVlbCBmb3IgbGF1bmNoaW5nIGFuZFxuLy8gIG1peGluZyBzb3VuZHMsIHN0cmluZ2luZyB0aGVtIHRvZ2V0aGVyIGluIHRpbWUsIGJ1aWxkaW5nIGFuIGFwcCByYXRoZXIgdGhhblxuLy8gIGEgZG9jdW1lbnQgKGJlY2F1c2UgSSB1c3VhbGx5IG1ha2UgZG9jdW1lbnRzIGZvciBteSBkYXktam9iLCBldmVuIHdoZW4gdGhleSdyZSBtYWRlXG4vLyAgbGlrZSBhIFNQQSkuIFBvdGVudGlhbGx5LCB0aGlzIHByb2plY3QgY291bGQgYmUgdXNlZCB0byBsZWFybiBhYm91dCBGUlAsIGFzIHdlbGwsXG4vLyAgYXMgdGhlIGludGVyZmFjZSBpcyBjcnlpbmcgb3V0IGZvciBiZXR0ZXIgY29kZSBhZXN0aGVzdGljcywgYnV0IHRoaXMgaXMgZm9yIGFcbi8vICBsYXRlciBzdGFnZS5cblxuXG4vLyBBdm9pZCB0aGUgYXBwIGFkZGluZyBnbG9iYWxzIHdpdGggYW4gSUlGRVxuLy8gaHR0cDovL2JlbmFsbWFuLmNvbS9uZXdzLzIwMTAvMTEvaW1tZWRpYXRlbHktaW52b2tlZC1mdW5jdGlvbi1leHByZXNzaW9uL1xuLy8gaHR0cDovL3d3dy5hZGVxdWF0ZWx5Z29vZC5jb20vSmF2YVNjcmlwdC1Nb2R1bGUtUGF0dGVybi1Jbi1EZXB0aC5odG1sXG4oZnVuY3Rpb24gKHdpbmRvdywgJCl7XG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cbi8vIGFwcCBuYW1lc3BhY2VcbnZhciBkcnVtTWFjaGluZSA9IHt9XG52YXIgZG0gPSBkcnVtTWFjaGluZTtcblxuXG4vL1xuLy8gdGhlIFwic3ludGhcIlxuLy8gZHJ1bSBzb3VuZHMsIGNoYW5uZWwgdG8gcGxheSB0aGVtIHRocm91Z2gsIGxvYWRlciB0byBsb2FkIHRoZW0gZXRjXG4vL1xuXG5kbS5zeW50aCA9IHt9XG5cbnZhciBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXG52YXIgbWF0Y2hEcnVtSUQgPSAvKD86XFwvNzA3KShcXHcrKSg/OlxcLikvaTtcblxuZnVuY3Rpb24gbG9hZFNvdW5kKCBzb3VuZFVybCApIHtcblx0dmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdC8vIERlY29kZSBhc3luY2hyb25vdXNseVxuXHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0dmFyIHhociA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgaWQgPSBtYXRjaERydW1JRC5leGVjKCBzb3VuZFVybCApWzFdLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0XHRcdGRydW1zWyBpZCBdLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdGJhbmcoIGRydW1zWyBpZCBdICk7XG5cdFx0fSk7XG5cblx0XHRtYXRjaERydW1JRC5sYXN0SW5kZXggPSAwO1xuXHR9O1xuXG5cdHJlcXVlc3Qub3BlbignR0VUJywgc291bmRVcmwsIHRydWUpO1xuXHRyZXF1ZXN0LnNlbmQoKTtcbn1cblxuXG5mdW5jdGlvbiBiYW5nKCBkcnVtICkge1xuXHR2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTsgLy8gY3JlYXRlcyBhIHNvdW5kIHNvdXJjZVxuXG5cdHNvdXJjZS5idWZmZXIgPSBkcnVtLmJ1ZmZlcjsgICAgICAgICAgICAgICAvLyB0ZWxsIHRoZSBzb3VyY2Ugd2hpY2ggc291bmQgdG8gcGxheVxuXHRzb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTsgICAgICAgLy8gY29ubmVjdCB0aGUgc291cmNlIHRvIHRoZSBjb250ZXh0J3MgZGVzdGluYXRpb24gKHRoZSBzcGVha2Vycylcblx0c291cmNlLnN0YXJ0KDApOyAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYXkgdGhlIHNvdXJjZSBub3dcbn1cblxuZG0uc3ludGguYmFuZyA9IGJhbmc7XG5cblxuLy8gbGlzdCBzb3VuZHMsIHRoZW4gbG9hZCBhbmQgcGxheSB0aGVtXG52YXIgZHJ1bXMgPSB7XG5cdCdjbGFwJyAgOiB7IGdyaWQ6IDEsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0NMQVAuV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9LFxuXHQnY293YmwnIDogeyBncmlkOiAyLCBwYXRoOiAnYXNzZXRzLzcwNy83MDdDT1dCTC5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCdodG0nICAgOiB7IGdyaWQ6IDMsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0hUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCdsdG0nICAgOiB7IGdyaWQ6IDQsIHBhdGg6ICdhc3NldHMvNzA3LzcwN0xUTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCdtdG0nICAgOiB7IGdyaWQ6IDUsIHBhdGg6ICdhc3NldHMvNzA3LzcwN01UTS5XQVYnLCBidWZmZXI6IHVuZGVmaW5lZCwgc291cmNlOiBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpIH0sXG5cdCdyaW1zaCcgOiB7IGdyaWQ6IDYsIHBhdGg6ICdhc3NldHMvNzA3LzcwN1JJTVNILldBVicsIGJ1ZmZlcjogdW5kZWZpbmVkLCBzb3VyY2U6IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCkgfSxcblx0J3RhbWJvJyA6IHsgZ3JpZDogNywgcGF0aDogJ2Fzc2V0cy83MDcvNzA3VEFNQk8uV0FWJywgYnVmZmVyOiB1bmRlZmluZWQsIHNvdXJjZTogY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKSB9XG59O1xuXG5kbS5zeW50aC5kcnVtcyA9IGRydW1zO1xuXG5mb3IoIGRydW0gaW4gZHJ1bXMgKSB7IGlmKCBkcnVtcy5oYXNPd25Qcm9wZXJ0eSggZHJ1bSApICl7XG5cdGRydW1zW2RydW1dLnNvdXJjZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuXHRsb2FkU291bmQoIGRydW1zW2RydW1dLnBhdGgsIGZ1bmN0aW9uIG9ubG9hZEhhbmRsZXIgKCkgeyBjb25zb2xlLmxvZygnb25sb2FkJywgYXJndW1lbnRzKTsgfSApO1xufX1cblxuXG5cblxuXG4vL1xuLy8gSW50ZXJmYWNlIChldmVudCBoYW5kbGluZylcbi8vIC0gdGhpcyBjb3VsZCBwcm9iYWJseSBiZWNvbWUgYSBraW5kIG9mIG1hc3RlciBvYmplY3QsIG9yIGNvbnRyb2xsZXJcblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG5mdW5jdGlvbiBoYW5kbGVQYWRIaXQgKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdC8vIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRkbS5zeW50aC5iYW5nKCBkbS5zeW50aC5kcnVtc1sgZXZlbnQudGFyZ2V0LmlkIF0gKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbi8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuJChkb2N1bWVudCkub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG4kKGRvY3VtZW50KS5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuLy8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBwYWRncmlkXG4vLyAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsIGhhbmRsZVBhZEhpdCApO1xuJCgnI3BhZGdyaWQnKS5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZG93bicsICdidXR0b24nLCBoYW5kbGVQYWRIaXQgKTtcbiQoJyNwYWRncmlkJykub24oJ21vdXNlZW50ZXInLCAnYnV0dG9uJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0aWYoIG1vdXNlZG93biApIHsgaGFuZGxlUGFkSGl0KCBldmVudCApOyB9XG59KTtcblxuXG59KHdpbmRvdywgJCkpO1xuLy8gZW5kIGFudGktZ2xvYmFsIElJRkUiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=