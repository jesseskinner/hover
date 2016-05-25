var Hover = (function(){

var slice = [].slice, undefined;

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

// return the Hover function
// actions is an iterable of reducers
// state is undefined by default, but initial state can be provided
function Hover(actions, state) {
	// list of state listeners specific to this store instance
	var stateListeners = [],

		// this is the store that will be returned
		store = function (callback) {
			// passing a function here is a synonym for subscribe
			if (isFunction(callback)) {
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
			}

			// return state
			return state;
		},

		// create an action for the api that calls an action handler and changes the state
		createAction = function (reducer) {
			// return a function that'll be attached to the api
			return function () {
				// convert arguments to a normal array
				var args = slice.call(arguments, 0),

					isOriginalAction = !inAction;

				inAction = true;

				// reduce the state & args into the new state
				state = reducer.apply(null, [state].concat(args));

				// only notify if this is the original action
				if (isOriginalAction) {
					// let all the subscribers know what just happened
					for (var i=0, listeners = stateListeners; i < listeners.length; i++) {
						listeners[i](state);
					}

					// this is done, there is no longer an action running
					inAction = false;
				}

				// return resulting state
				return state;
			};
		},

		inAction = false,

		method;

	// DEPRECATED: expose store as explicit api on the store
	store.getState = function (callback) {
		if (typeof console !== 'undefined' && typeof console.error === 'function') {
			console.error('Hover: store.getState() is deprecated. Use store() instead.');
		}
		return store(callback);
	};

	// create actions on the store api as well
	for (method in actions) {
		store[method] = createAction(actions[method]);
	}

	// return the store function as the exposed api
	return store;
};

Hover.compose = function (definition) {
	var store = Hover({
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

		key,

		subscribe = function (key) {
			var fn = store[key] = definition[key];

			definition[key] = undefined;

			fn(function (state) {
				definition[key] = state;

				// pass to setState, but only after compose is done
				if (initialized) {
					setState(definition);
				}
			});
		},

		translateAction = function (key) {
			var action = definition[key];

			return function () {
				action.apply(null, arguments);

				// return translated state
				return store();
			};
		};

	delete store.s;

	if (definitionIsFunction) {
		definition(setState);

		for (key in definition) {
			if (isFunction(definition[key]) && definition[key] !== definition) {
				store[key] = translateAction(key);
			}
		}

	} else {
		if (definition) {
			// collect subscriptions without actually executing yet
			for (key in definition) {
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

return Hover;

})(); // execute immediately

// export for CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Hover;
}
