var Hoverboard = (function(){
'use strict';

var slice = [].slice;

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

// remove item from array, returning a new array
function removeFromArray(array, removeItem) {
	var newArray = [].concat(array);
	var index = newArray.indexOf(removeItem);

	if (index !== -1) {
		newArray.splice(index, 1);
	}

	return newArray;
}

function isFunction(fn) {
	return typeof fn === 'function';
}

// return the Hoverboard function
// actions is an iterable of reducers
function Hoverboard(actions) {
	// list of state listeners specific to this store instance
	var stateListeners = [],

		// undefined by default
		state,

		// add a state change listener
		subscribe = function (callback) {
			// add callback as listener to change event
			stateListeners.push(callback);

			// call callback right away
			callback(state);

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

			// return state
			return state;
		},

		// ensure only one action is handled at a time
		actionLock = createLock('Cannot call action in the middle of an action'),

		// create an action for the api that calls an action handler and changes the state
		createAction = function (action) {
			// return a function that'll be attached to the api
			return function () {
				var args = [state].concat(slice.call(arguments, 0)),

					// make local copy in case someone unsubscribes during
					listeners = stateListeners,

					i;

				// prevent a subsequent action being called during an action
				actionLock(function () {
					state = action.apply(null, args);

					// let everyone know the state has changed
					for (i=0; i < listeners.length; i++) {
						listeners[i](state);
					}
				});

				// return resulting state
				return state;
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
				for (var i=0; i < transforms.length; i++) {
					newState = transforms[i](newState);
				}

				return newState;
			}
		}),

		// we will use arguments once we're done initializing
		transforms = slice.call(arguments, 1),

		// in this case, we're exposing the raw setState,
		// so we'll need to use merge to make sure transforms get full state
		definitionIsFunction = isFunction(definition),

		// private setState method
		setState = store.s,

		initialized = false,

		subscribe = function (key) {
			var fn = definition[key];

			definition[key] = undefined;

			fn(function (state) {
				definition[key] = state;

				// pass to setState, but only after compose is done
				if (initialized) {
					setState(definition);
				}
			});
		};

	delete store.s;

	if (definitionIsFunction) {
		definition(setState);

	} else {
		if (definition) {	
			// collect subscriptions without actually executing yet
			for (var key in definition) {
				if (isFunction(definition[key])) {
					subscribe(key);
				}
			}
		}

		// call setState with final definition, so transforms can do their thing
		setState(definition);

		initialized = true;
	}

	return store;
};

return Hoverboard;

})(); // execute immediately
