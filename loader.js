// Widget -- Loader
var EMCBigData = (function( App, $, signals ) {
	"use strict";

	var loader = function ( paths ) {

		var _instance = {};

		//
		// PRIVATE VARS
		//
		var _paths = [];
		var _data  = [];
		var _index = 0;

		if ( typeof paths === 'string' ) {
			_paths.push( paths );
		} else if ( paths.length ) {
			_paths = paths;
		}


		//
		// PRIVATE functions
		//

		// FIFO load
		function _load ( /* data, index */ ) {
			if( _paths.length > 0 ) {
				_requestData( _paths.shift() );
			} else {
				_instance.finished.dispatch( _data );
			}
		}

		/**
		 * async content loader
		 * @param {string} star
		 */
		function _requestData ( path ) {
			var attempts = 0;
// console.log( 'loader::_requestData - path', path );

			(function __setContent ( data ) {
				if( !data ) {

					$.get( path )
						.done( __setContent )
						.fail( function () {
							if( attempts < 3 ) {
								__setContent();
								attempts += 1;
							} else {
								throw new Error ("Failed to retrieve data from " + path );
							}
						});
				} else {
					_data.push( data );
					_instance.progress.dispatch( data, _index );
					_index += 1;
				}
			}());
		}




		// API
		_instance.load = _load;
		_instance.getData = function ( indx ) { return _data[ indx ]; };

		// Events/messages (requiress JS-Signals)
		_instance.progress = new signals.Signal();
		_instance.finished = new signals.Signal();

		// message handler assignments
		_instance.progress.add( _load );

		return _instance;
	};


	// Add contentPanel to Views collection
	App.Widgets = App.Widgets || {};
	App.Widgets.loader = loader;

	return App;
}( EMCBigData || {}, jQuery, signals ));
