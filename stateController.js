// State Controller
// Copyright (c) Alexander Shpak, Alexander Melanchenko 2009-2015

var SC = function ( ) {

	// Private fields

	var handlers = {};
	var states = {};
	var self;

	// Private methods

	var $ = function ( id ) {
		try {
			return ( typeof id == "string" ) ? document.getElementById( id ) : id;
		} catch ( e ) { return null; };
	};

	var parseSCAttr = function ( scAttr ) { 
		// directive = [level*]handler:state[:param1:param2..:param_n]
		// list of directives = directive1|directive2..|directive_n
		var tmpObj = {};
		var directives = scAttr.split("|");
		for ( var i=0, l=directives.length; i<l; i++ ) {
			var tmpDirective = {};
			var d = directives[ i ].split( "*" );
			tmpDirective.level = 0;
			if( d.length > 1 ) {
				tmpDirective.level = d[0];
				d.shift();
			};
			var params = d[ 0 ].split( ":" );
			tmpDirective.func = params.shift();
			var tmpState = tmpDirective.state = params.shift();
			tmpDirective.args = params;
			if ( !tmpObj[ tmpState ] ) tmpObj[ tmpState ] = [];
			tmpObj[ tmpState ].push( tmpDirective );

		};
		if(SC.dbg) console.debug('SC.parseSCAttr:', scAttr, tmpObj);
		return tmpObj;
	};

	var inspectChildren = function ( container, stateName, options, depth ) {
		var chNodes = container.childNodes;
		for ( var i=chNodes.length; i-->0; ) {
			if( chNodes[ i ].nodeType == 1 ) {
				inspectNode( chNodes[ i ], stateName, options );
				if ( depth < options.d ) inspectChildren( chNodes[ i ], stateName, options, depth+1 );
			};
		}; 
	};

	var inspectNode = function ( node, stateName, options ) {
		if (SC.dbg || (options.hasOwnProperty('dbg') && options.dbg))
			console.debug('SC.inspectNode:', arguments);
		if ( node.nodeType != 1 ) return;
		var attrVal = node.getAttribute( "SC" );
		if ( !attrVal ) attrVal = node.getAttribute( "sc" );
		if ( !attrVal ) return;
		if ( !node._SC_ ) node._SC_ = parseSCAttr( attrVal );
		var scData = node._SC_;
		if ( !scData[ stateName ] ) return;
		var execStack = scData[ stateName ];
		if ( options.l != "all" ) {
			execStack = [];
			for ( var i=0, l=scData[ stateName ].length; i<l; i++ ) {
				var elem = scData[ stateName ][ i ];
				for ( var j=options.l.length; j-->0; ) {
					if ( String(elem.level) == String(options.l[ j ]) ) execStack.push( elem );
				};
			};
		};
		for ( var i=0, l=execStack.length; i<l; i++ ) {
			if( handlers[ execStack[ i ].func ] ) {
				handlers[ execStack[ i ].func ].call( self, node, execStack[ i ], options.data );
			};
		};
	};

	var launchTreeWalk = function ( obj ) {
		var stateName, options, container;
		for ( var i in obj ) {
			if ( obj[ i ] instanceof Object && obj[ i ].c ) {
				stateName = i;
				options = obj[ i ];
				break;
			}
		}
		if ( !stateName ) return;
		if ( options.hasOwnProperty("v") ) set( stateName, options.v ); // set state value
		if ( !(options.c instanceof Array) ) options.c = [ options.c ];
		var containerList = options.c;
		options.l = ( options.l )? options.l.toString().split(",") : "all"; // if levels is not set, use all handlers
		options.data = options.data || {}; // data
		options.d = options.d || 0; // depth
		var propagationList = options.p = ( options.p )? options.p.toString().split(",") : ["*"];// propagation
		for ( var i=0, l=containerList.length; i<l; i++ ) {
			var container = $( containerList[i] );
			if (SC.dbg || (options.hasOwnProperty('dbg') && options.dbg))
				console.debug('SC.launchTreeWalk:', 'stateName:', stateName, ',container:', container, ',options', options);
			if ( !container ) continue;
			inspectNode( container, stateName, options ); // incpecting parent node
			if ( propagationList[0] == "parent" ) continue;
			for( var j=0, k=propagationList.length; j<k; j++ ) {
				var selector = propagationList[ j ];
				if( selector == "childNodes" ) {
					inspectChildren( container, stateName, options, 1 );
				}
				else 
				{
					if ( selector.indexOf(".") == 0 ) {
						var nodeList = container.getElementsByClassName( selector.slice(1) );
					}
					else
					{
						var nodeList = container.getElementsByTagName( selector );
					};
					for ( var elem=nodeList.length; elem-->0; ) {
						inspectNode( nodeList[ elem ], stateName, options );
					};
				}
			};
		};
	};

	// Public methods

	var launch = function ( ) {
		try {
			self = this;
			for ( var i=0, l=arguments.length; i<l; i++ ) {
				launchTreeWalk( arguments[ i ] );
			};
		} catch ( e ) { };
	};

	var set = function ( name, value ) {
		try {
			states[ name ] = value;
		} catch ( e ) { }
	};

	var get = function ( name ) {
		try {
			return states[ name ];
		} catch ( e ) { return undefined }
	};

	var addHandler = function ( name, func ) {
		if(SC.dbg) console.log('SC.addHandler:', name, typeof func);
		try {
			handlers[ name ] = func;
		} catch ( e ) { } 
	};
	
	var getHandler = function ( name ) {
		try {
			return handlers[ name ];
		} catch ( e ) { return null }
	};

	var dbg = false;
    // Return object
	return {
		launch: launch
		,set: set
		,get: get
		,addHandler: addHandler
		,getHandler: getHandler
		,setSC: function(el, val) { var el = $(el); if(!el) return; el.setAttribute('sc', val); el._SC_ = parseSCAttr(val); }
        ,register: function(a) { var i,h; for(i in a) { h = SC.getHandler(i); if(undefined===h) SC.addHandler( i, a[i] ); } }
		,splitFor: function(node, pat) {
			var scs = node.getAttribute('sc'), i, re = (pat instanceof RegExp) ? pat : new RegExp('^'+pat, 'i');
			if (!scs) scs = node.getAttribute('SC');
			if (scs) {
				scs = scs.split('|');
				for (i=0; i<scs.length; i++) {
					if (null !== scs[i].match(re)) {
						return scs[i].split(':');
					}
				}
			}
			return [];
		}
		,dbg: dbg
	}
}();
