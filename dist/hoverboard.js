var Hoverboard = (function(){
'use strict';

var slice = [].slice,
	toString = Object.prototype.toString;

// lock a function to prevent recursion
function createLock(errorMessage) {
	var isLocked = false;

	// ensure callback only executes once at a time
	return function (callback) {
		var result;

		if (isLocked) {
			throw new Error('Hoverboard: ' + errorMessage);
		}

		isLocked = true;

		try {
			result = callback();
		} finally {
			// whether or not there was an error, we're done here
			isLocked = false;
		}

		return result;
	};
}

// efficiently execute an action given a set of arguments
function runAction(action, state, args, a, b, c){
	var len = args.length;

	// actually call the action directly. try to avoid using apply for common cases
	if (len === 0) {
		return action(state);
	} else if (len === 1) {
		return action(state, a);
	} else if (len === 2) {
		return action(state, a, b);
	} else if (len === 3) {
		return action(state, a, b, c);
	}

	// four or more arguments, just use apply
	args = [state].concat(slice.call(args, 0));

	return action.apply(null, args);
}

// remove item from array, returning a new array
function removeFromArray(array, removeItem) {
	var newArray = [].concat(array);
	var index = newArray.indexOf(removeItem);

	if (index !== -1) {
		newArray.splice(index, 1);
	}

	return newArray;
}

function isArray(arr) {
    return arr && toString.call(arr) === '[object Array]';
}

function isFunction(fn) {
	return typeof fn === 'function';
}

function isObject(obj) {
	return obj &&
		typeof obj === 'object' &&
		toString.call(obj) === '[object Object]';
}

function isPlainObject(obj) {
	return isObject(obj) &&
		isFunction(obj.constructor) &&
		isObject(obj.constructor.prototype) &&
		obj.constructor.prototype.hasOwnProperty('isPrototypeOf');
}

function merge(destination, source, key) {
	// if source and destination are both plain objects
	if (isPlainObject(source) && isPlainObject(destination)) {
		// shallow merge properties into destination object
		for (key in source) {
			destination[key] = source[key];
		}

		return destination;
	}

	// otherwise, just return source
	return source;
}

// return the Hoverboard function
// actions is an iterable of reducers
function Hoverboard(actions) {
	// list of state listeners specific to this store instance
	var stateListeners = [],

		// undefined by default
		state,

		// merge a state object into the existing state object
		setState = function (newState) {
			// make local copy in case someone unsubscribes during
			var listeners = stateListeners;

			// merge newState into the official state
			state = merge(getState(), newState);

			// let everyone know the state has changed
			for (var i=0;i < listeners.length;i++) {
				listeners[i](getState());
			}
		},

		// add a state change listener
		subscribe = function (callback) {
			// add callback as listener to change event
			stateListeners.push(callback);

			// call callback right away
			callback(getState());

			// return an unsubscribe function specific to this listener
			return function () {
				// only call removeListener once, then destroy the callback
				if (callback) {
					stateListeners = removeFromArray(stateListeners, callback);
					callback = undefined;
				}
			};
		},

		// returns the current official state. used for actions
		getState = function (callback) {
			// passing a function here is a synonym for subscribe
			if (isFunction(callback)) {
				return subscribe(callback);
			}

			// return a shallow copy of state
			return merge({}, state);
		},

		// ensure only one action is handled at a time
		actionLock = createLock('Cannot call action in the middle of an action'),

		// create an action for the api that calls an action handler and changes the state
		createAction = function (action) {
			// return a function that'll be attached to the api
			return function (a, b, c) {
				var args = arguments;

				// prevent a subsequent action being called during an action
				actionLock(function () {
					setState(runAction(action, getState(), args, a, b, c));
				});

				// allow chaining
				return this;
			};
		},

		method;

	// expose these as explicit api on the getState function
	getState.getState = getState;

	// create actions on the getState api as well
	for (method in actions) {
		getState[method] = createAction(actions[method]);
	}

	// return the getState function as the exposed api
	return getState;
};

Hoverboard.compose = function (definition) {
	var store = Hoverboard({
			s: function (state, newState) {
				if (!initializing) {
					newState = merge(state, newState);

					for (var i=0; i < transforms.length; i++) {
						newState = transforms[i](newState);
					}
				}

				return newState;
			}
		}),

		// we will use arguments once we're done initializing
		transforms = slice.call(arguments, 1),

		// in this case, we're exposing the raw setState,
		// so we'll need to use merge to make sure transforms get full state
		definitionIsFunction = isFunction(definition),

		// unless definition is a function, hold off on running transforms for now
		initializing = !definitionIsFunction,

		// private setState method
		setState = store.s;

	delete store.s;

	// make a local copy of definition if possible (plain object or array)
	if (isArray(definition)) {
		definition = slice.call(definition);
		
	} else if (isPlainObject(definition)) {
		definition = merge({}, definition);
	}

	function subscribe(key) {
		var fn = definition[key];
		
		definition[key] = undefined;

		fn(function (state) {
			definition[key] = state;
			setState(definition);
		});
	}

	if (definitionIsFunction) {
		definition(setState);

	} else {
		if (definition) {
			for (var key in definition) {
				if (isFunction(definition[key])) {
					subscribe(key);
				}
			}
		}

		// now it's safe to let transforms have access to the state
		initializing = false;

		// call setState with final definition, so transforms can do their thing
		setState(definition);
	}

	return store;
};

return Hoverboard;

})(); // execute immediately
