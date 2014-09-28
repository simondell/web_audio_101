// Avoid the app adding globals with an IIFE
// http://benalman.com/news/2010/11/immediately-invoked-function-expression/
// http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html
(function (window, $){

// An experiment borrowing heavily from hTML5Rocks
// http://www.html5rocks.com/en/tutorials/webaudio/intro/

// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

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
	    playSound( drums[ id ].buffer );
		});

		matchDrumID.lastIndex = 0;
	};

  request.open('GET', soundUrl, true);
  request.send();
}

function playSound(buffer) {
  var source = context.createBufferSource(); // creates a sound source
  source.buffer = buffer;                    // tell the source which sound to play
  source.connect(context.destination);       // connect the source to the context's destination (the speakers)
  source.start(0);                           // play the source now
                                             // note: on older systems, may have to use deprecated noteOn(time);
}




// list sounds, then load and play them
var drums = {
	'clap'  : { grid: 1, path: 'assets/707/707CLAP.WAV', buffer: {} },
	'cowbl' : { grid: 2, path: 'assets/707/707COWBL.WAV', buffer: {} },
	'htm'   : { grid: 3, path: 'assets/707/707HTM.WAV', buffer: {} },
	'ltm'   : { grid: 4, path: 'assets/707/707LTM.WAV', buffer: {} },
	'mtm'   : { grid: 5, path: 'assets/707/707MTM.WAV', buffer: {} },
	'rimsh' : { grid: 6, path: 'assets/707/707RIMSH.WAV', buffer: {} },
	'tambo' : { grid: 7, path: 'assets/707/707TAMBO.WAV', buffer: {} }
};

var drumButtonTemplate = '<button type="button" id="{{ID}}">{{ID}}</button>'
var buttonHTML = '';


// function() {
//     context.decodeAudioData(request.response, function(buffer) {
//       soundBuffer = buffer;
//       playSound( soundBuffer );
//     });
//   }

var matchDrumID = /(?:\/707)(\w+)(?:\.)/i;


for( drum in drums ) { if( drums.hasOwnProperty( drum ) ){
	// loadSound( drums[drum].path, function onloadHandler () { console.log('onload', arguments); } );
	loadSound( drums[drum].path );
}}





//
// Event handling
//

var mousedown = false;

function handleDrumHit ( event ) {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
	playSound( drums[ event.target.id].buffer );

	// blur if clicked (but doesn't actually work)
	if( /mouse/.test( event.type ) ) event.target.blur();
}

// toggle mousedown flag, used for dragging an 'active" mouse over machine controls
$(document).on('mousedown', function toggleMouseDownTrue () { mousedown = true; } );
$(document).on('mouseup', function toggleMouseDownFalse () { mousedown = false; } );

// delegate drum pad taps to drumgrid
// $('#drumgrid').on('keydown', handleDrumHit );
$('#drumgrid').on('touchstart', 'button', handleDrumHit );
$('#drumgrid').on('mousedown', 'button', handleDrumHit );
$('#drumgrid').on('mouseenter', 'button', function ( event ) {
	if( mousedown ) { handleDrumHit( event ); }
});


}(window, $));
// end anti-global IIFE
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYmF1ZGlvMTAxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQXZvaWQgdGhlIGFwcCBhZGRpbmcgZ2xvYmFscyB3aXRoIGFuIElJRkVcbi8vIGh0dHA6Ly9iZW5hbG1hbi5jb20vbmV3cy8yMDEwLzExL2ltbWVkaWF0ZWx5LWludm9rZWQtZnVuY3Rpb24tZXhwcmVzc2lvbi9cbi8vIGh0dHA6Ly93d3cuYWRlcXVhdGVseWdvb2QuY29tL0phdmFTY3JpcHQtTW9kdWxlLVBhdHRlcm4tSW4tRGVwdGguaHRtbFxuKGZ1bmN0aW9uICh3aW5kb3csICQpe1xuXG4vLyBBbiBleHBlcmltZW50IGJvcnJvd2luZyBoZWF2aWx5IGZyb20gaFRNTDVSb2Nrc1xuLy8gaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvd2ViYXVkaW8vaW50cm8vXG5cbi8vIEZpeCB1cCBwcmVmaXhpbmdcbndpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG52YXIgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxuZnVuY3Rpb24gbG9hZFNvdW5kKCBzb3VuZFVybCApIHtcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG4gIC8vIERlY29kZSBhc3luY2hyb25vdXNseVxuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uIGhhbmRsZUxvYWRTb3VuZCAoIGV2ZW50ICkge1xuXHRcdGlmKCBldmVudC50eXBlICE9PSAnbG9hZCcgKSByZXR1cm47XG5cdFx0dmFyIHhociA9IGV2ZW50LnRhcmdldDtcblx0XHR2YXIgaWQgPSBtYXRjaERydW1JRC5leGVjKCBzb3VuZFVybCApWzFdLnRvTG93ZXJDYXNlKCk7XG5cblx0ICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSggeGhyLnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcblx0ICAgIGRydW1zWyBpZCBdLmJ1ZmZlciA9IGJ1ZmZlcjtcblx0ICAgIHBsYXlTb3VuZCggZHJ1bXNbIGlkIF0uYnVmZmVyICk7XG5cdFx0fSk7XG5cblx0XHRtYXRjaERydW1JRC5sYXN0SW5kZXggPSAwO1xuXHR9O1xuXG4gIHJlcXVlc3Qub3BlbignR0VUJywgc291bmRVcmwsIHRydWUpO1xuICByZXF1ZXN0LnNlbmQoKTtcbn1cblxuZnVuY3Rpb24gcGxheVNvdW5kKGJ1ZmZlcikge1xuICB2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTsgLy8gY3JlYXRlcyBhIHNvdW5kIHNvdXJjZVxuICBzb3VyY2UuYnVmZmVyID0gYnVmZmVyOyAgICAgICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcbiAgc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG4gIHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3RlOiBvbiBvbGRlciBzeXN0ZW1zLCBtYXkgaGF2ZSB0byB1c2UgZGVwcmVjYXRlZCBub3RlT24odGltZSk7XG59XG5cblxuXG5cbi8vIGxpc3Qgc291bmRzLCB0aGVuIGxvYWQgYW5kIHBsYXkgdGhlbVxudmFyIGRydW1zID0ge1xuXHQnY2xhcCcgIDogeyBncmlkOiAxLCBwYXRoOiAnNzA3LzcwN0NMQVAuV0FWJywgYnVmZmVyOiB7fSB9LFxuXHQnY293YmwnIDogeyBncmlkOiAyLCBwYXRoOiAnNzA3LzcwN0NPV0JMLldBVicsIGJ1ZmZlcjoge30gfSxcblx0J2h0bScgICA6IHsgZ3JpZDogMywgcGF0aDogJzcwNy83MDdIVE0uV0FWJywgYnVmZmVyOiB7fSB9LFxuXHQnbHRtJyAgIDogeyBncmlkOiA0LCBwYXRoOiAnNzA3LzcwN0xUTS5XQVYnLCBidWZmZXI6IHt9IH0sXG5cdCdtdG0nICAgOiB7IGdyaWQ6IDUsIHBhdGg6ICc3MDcvNzA3TVRNLldBVicsIGJ1ZmZlcjoge30gfSxcblx0J3JpbXNoJyA6IHsgZ3JpZDogNiwgcGF0aDogJzcwNy83MDdSSU1TSC5XQVYnLCBidWZmZXI6IHt9IH0sXG5cdCd0YW1ibycgOiB7IGdyaWQ6IDcsIHBhdGg6ICc3MDcvNzA3VEFNQk8uV0FWJywgYnVmZmVyOiB7fSB9XG59O1xuXG52YXIgZHJ1bUJ1dHRvblRlbXBsYXRlID0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwie3tJRH19XCI+e3tJRH19PC9idXR0b24+J1xudmFyIGJ1dHRvbkhUTUwgPSAnJztcblxuXG4vLyBmdW5jdGlvbigpIHtcbi8vICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcbi8vICAgICAgIHNvdW5kQnVmZmVyID0gYnVmZmVyO1xuLy8gICAgICAgcGxheVNvdW5kKCBzb3VuZEJ1ZmZlciApO1xuLy8gICAgIH0pO1xuLy8gICB9XG5cbnZhciBtYXRjaERydW1JRCA9IC8oPzpcXC83MDcpKFxcdyspKD86XFwuKS9pO1xuXG5cbmZvciggZHJ1bSBpbiBkcnVtcyApIHsgaWYoIGRydW1zLmhhc093blByb3BlcnR5KCBkcnVtICkgKXtcblx0Ly8gbG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoLCBmdW5jdGlvbiBvbmxvYWRIYW5kbGVyICgpIHsgY29uc29sZS5sb2coJ29ubG9hZCcsIGFyZ3VtZW50cyk7IH0gKTtcblx0bG9hZFNvdW5kKCBkcnVtc1tkcnVtXS5wYXRoICk7XG59fVxuXG5cblxuXG5cbi8vXG4vLyBFdmVudCBoYW5kbGluZ1xuLy9cblxudmFyIG1vdXNlZG93biA9IGZhbHNlO1xuXG5mdW5jdGlvbiBoYW5kbGVEcnVtSGl0ICggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0cGxheVNvdW5kKCBkcnVtc1sgZXZlbnQudGFyZ2V0LmlkXS5idWZmZXIgKTtcblxuXHQvLyBibHVyIGlmIGNsaWNrZWQgKGJ1dCBkb2Vzbid0IGFjdHVhbGx5IHdvcmspXG5cdGlmKCAvbW91c2UvLnRlc3QoIGV2ZW50LnR5cGUgKSApIGV2ZW50LnRhcmdldC5ibHVyKCk7XG59XG5cbi8vIHRvZ2dsZSBtb3VzZWRvd24gZmxhZywgdXNlZCBmb3IgZHJhZ2dpbmcgYW4gJ2FjdGl2ZVwiIG1vdXNlIG92ZXIgbWFjaGluZSBjb250cm9sc1xuJChkb2N1bWVudCkub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93blRydWUgKCkgeyBtb3VzZWRvd24gPSB0cnVlOyB9ICk7XG4kKGRvY3VtZW50KS5vbignbW91c2V1cCcsIGZ1bmN0aW9uIHRvZ2dsZU1vdXNlRG93bkZhbHNlICgpIHsgbW91c2Vkb3duID0gZmFsc2U7IH0gKTtcblxuLy8gZGVsZWdhdGUgZHJ1bSBwYWQgdGFwcyB0byBkcnVtZ3JpZFxuLy8gJCgnI2RydW1ncmlkJykub24oJ2tleWRvd24nLCBoYW5kbGVEcnVtSGl0ICk7XG4kKCcjZHJ1bWdyaWQnKS5vbigndG91Y2hzdGFydCcsICdidXR0b24nLCBoYW5kbGVEcnVtSGl0ICk7XG4kKCcjZHJ1bWdyaWQnKS5vbignbW91c2Vkb3duJywgJ2J1dHRvbicsIGhhbmRsZURydW1IaXQgKTtcbiQoJyNkcnVtZ3JpZCcpLm9uKCdtb3VzZWVudGVyJywgJ2J1dHRvbicsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdGlmKCBtb3VzZWRvd24gKSB7IGhhbmRsZURydW1IaXQoIGV2ZW50ICk7IH1cbn0pO1xuXG5cbn0od2luZG93LCAkKSk7XG4vLyBlbmQgYW50aS1nbG9iYWwgSUlGRSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==