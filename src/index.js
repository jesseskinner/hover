module.exports = (function(){
'use strict';

var slice = [].slice;

// remove a callback from a list of state change listeners
function removeListener(listeners, callback) {
	var remainingListeners = [], i, listener;

	for (i=0;i < listeners.length;i++) {
		listener = listeners[i];

		// if this is the callback function, don't include it in the new list
		if (listener !== callback) {
			remainingListeners.push(listener);
		}
	}

	// return the list of listeners other than the callback
	return remainingListeners;
}

// helper function to test if a variable is a function
function isFunction(fn) {
	return typeof fn === 'function';
}

function isObject(obj) {
	return obj && typeof obj === 'object' && (
		typeof obj.length !== 'number' || !isFunction(obj.splice)
	);
}

// create a class using an object as a prototype
function createClass(originalClass, setState, initSelf) {
	var constructor, newClass = function(){
		initSelf(this);
		
		if (constructor) {
			return constructor.apply(this, [setState]);
		}
	}, original, k;

	// if a "class" is provided, use the prototype as the object
	if (isFunction(originalClass)) {
		original = originalClass.prototype;
		constructor = originalClass;
		
	} else {
		// if an object is provided, use that as the prototype
		original = originalClass;
	}

	// copy properties over so we can mangle them without affecting original
	for (k in original) {
		newClass.prototype[k] = original[k];
	}

	return newClass;
}

// return the Hoverboard function
return function (StoreClass) {
	// keep track of instance state, defaults to empty object
	var internalState = {},

		// list of state listeners specific to this store instance
		stateListeners = [],

		// ensure only one action is handled at a time globally
		isActionBeingHandled = 0,

		// used to provide better error message with circular state listening/changing
		isStateBeingChanged = 0,

		// merge a state object into the existing state object
		setState = function (newState) {
			var key, i, listeners;
		
			// if the state for this store is already being changed, throw an error
			if (isStateBeingChanged) {
				throw new Error('Hoverboard: Cannot change state during a state change event');
			}

			// keep track that state for this store is currently being or has ever changed
			isStateBeingChanged = 1;

			// if internalState and newState are objects, merge in new properties
			if (isObject(internalState) && isObject(newState)) {
				// shallow merge
				for (key in newState) {
					internalState[key] = newState[key];
				}

			// otherwise, just use the newState as official state
			} else {
				internalState = newState;
			}

			try {

				// make local copy in case someone unsubscribes during
				listeners = stateListeners;
				
				// let everyone know the state has changed
				for (i=0;i < listeners.length;i++) {
					listeners[i](getState());
				}

			} finally {
				// all done changing the state, even if there was an error
				isStateBeingChanged = 0;
			}
		},

		// add a state change listener
		addStateListener = function (callback){
			// add callback as listener to change event
			stateListeners.push(callback);

			// call callback right away
			callback(getState());

			// return an unsubscribe function specific to this listener
			return function () {
				// only call removeListener once, then destroy the callback
				if (callback) {
					stateListeners = removeListener(stateListeners, callback);
					callback = null;
				}
			};
		},

		// returns the current official state. used for actions
		getState = function () {
			// return the official state
			return internalState;
		},

		// create an action for the api that calls an action handler method on the instance
		createAction = function (method) {
			// return a function that'll be attached to the api
			return function (a,b,c) {
				// prevent a subsequent action being called during an action
				if (isActionBeingHandled) {
					throw new Error('Hoverboard: Cannot call action in the middle of an action');
				}

				// remember that we're in the middle of an action
				isActionBeingHandled = 1;

				// initialize the
				var state = getState(),
					len = arguments.length,
					result, args, undefined;

				try {
					// actually call the action directly. try to avoid using apply for common cases
					if (len === 0) {
						result = instance[method](state);
					} else if (len === 1) {
						result = instance[method](state, a);
					} else if (len === 2) {
						result = instance[method](state, a, b);
					} else if (len === 3) {
						result = instance[method](state, a, b, c);
					} else {
						// four or more arguments, just use apply
						args = [state].concat(slice.call(arguments, 0));
						result = instance[method].apply(instance, args);
					}

					if (isFunction(result)) {
						result(setState);

					// only set the state if it's not undefined
					} else if (result !== undefined) {
						setState(result);
					}
				} finally {
					// whether or not there was an error, we're done here
					isActionBeingHandled = 0;
				}
			};
		},

		// return a single public method for getting state (one time or with a listener)
		api = function (callback) {
			if (isFunction(callback)) {
				// return an unsubscribe function if callback is provided
				return addStateListener(callback);
			}

			// return the state if no callback provided
			return getState();
		},

		method,

		// internal store, instance of StoreClass
		instance;

	// create a special class based on the function or object provided
	StoreClass = createClass(StoreClass, setState, function(self){
		instance = self;
	});

	// instantiate the store class, passing in setState
	instance = new StoreClass();

	// create actions on the api
	for (method in instance) {
		// create an action on the api with appropriate action name
		api[method] = createAction(method);
	}

	// create & expose the api for public use, exposing actions and getState method
	return api;
};

})(); // execute immediately
