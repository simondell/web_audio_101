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
	'clap'  : { grid: 1, path: '707/707CLAP.WAV', buffer: {} },
	'cowbl' : { grid: 2, path: '707/707COWBL.WAV', buffer: {} },
	'htm'   : { grid: 3, path: '707/707HTM.WAV', buffer: {} },
	'ltm'   : { grid: 4, path: '707/707LTM.WAV', buffer: {} },
	'mtm'   : { grid: 5, path: '707/707MTM.WAV', buffer: {} },
	'rimsh' : { grid: 6, path: '707/707RIMSH.WAV', buffer: {} },
	'tambo' : { grid: 7, path: '707/707TAMBO.WAV', buffer: {} }
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