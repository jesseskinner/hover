var Hoverboard = (function(){
'use strict';

// use JSON to serialize and unserialize data
var serialize = JSON.stringify;
var unserialize = JSON.parse;

// ensure only one action is handled at a time globally
var isActionBeingHandled = 0;

// constants
var REGEX_ACTION_METHOD = (/^on[A-Z]/);
var SERIALIZED_EMPTY_OBJECT = '{}';

// create the public API with action methods
function createApi(instance, addStateListener) {
	var api = {}, action, method, actionMethod;

	// create actions on the api
	for (method in instance) {
		// if it looks like an action handler, eg. onAction
		if (REGEX_ACTION_METHOD.test(method)) {
			// create an action on the api with appropriate action name
			action = createAction(instance, method);
			actionMethod = getActionMethod(method);

			api[actionMethod] = action;
		}
	}

	// add a single public method for getting state (one time or with a listener)
	api.getState = function (callback) {
		if (isFunction(callback)) {
			// return an unsubscribe function if callback is provided
			return addStateListener(callback);
		}

		// return the state if no callback provided
		return instance.getState();
	};

	return api;
}

// create an action for the api that calls an action handler method on the instance
function createAction(instance, method) {
	// return a function that'll be attached to the api
	return function (a,b,c) {
		// prevent a subsequent action being called during an action
		if (isActionBeingHandled) {
			throw new Error('Hoverboard: Cannot call action in the middle of an action');
		}

		// remember that we're in the middle of an action
		isActionBeingHandled = 1;

		// create a copy of the state for local use
		instance.state = instance.getState();

		try {
			var len = arguments.length;

			// actually call the action directly. try to avoid using apply for common cases
			if (len === 0) {
				instance[method]();
			} else if (len === 1) {
				instance[method](a);
			} else if (len === 2) {
				instance[method](a, b);
			} else if (len === 3) {
				instance[method](a, b, c);
			} else {
				// four or more arguments, just use apply
				instance[method].apply(instance, arguments);
			}

		} finally {
			// whether or not there was an error, we're done here
			isActionBeingHandled = 0;
		}
	};
}

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

// convert an action handler like "onSomeAction" to an action method like "someAction"
function getActionMethod(method) {
	return method.charAt(2).toLowerCase() + method.substring(3);
}

// create a class using an object as a prototype
function createClass(StoreClass) {
	var copy = {}, original, k;

	// if a "class" is provided, use the prototype as the object
	if (isFunction(StoreClass)) {
		original = StoreClass.prototype;
	} else {
		// if an object is provided, create a function for the "class"
		original = StoreClass;
		StoreClass = function(){};
	}

	// copy properties over so we can mangle them without affecting original
	for (k in original) {
		copy[k] = original[k];
	}

	StoreClass.prototype = copy;

	return StoreClass;
}

// return the Hoverboard function
return function (StoreClass) {
	// create a special class based on the function or object provided
	StoreClass = createClass(StoreClass);

	// keep track of serialized instance state (to ensure immutability)
	var serializedState = null,

		// list of state listeners specific to this store instance
		stateListeners = [],

		// used to provide better error message with circular state listening/changing
		isStateBeingChanged = 0,

		// initialize the state the first time we need it
		initState = function (self) {
			// if already initialized, stop
			if (serializedState !== null) {
				return;
			}

			// default to an empty object
			serializedState = SERIALIZED_EMPTY_OBJECT;

			// also use getInitialState if available
			if (isFunction(self.getInitialState)) {
				var state = self.getInitialState(),
					currentState = serializedState;

				// if something was returned, merge it in
				// this allows setState to be called from getInitialState
				if (state) {
					checkState(state);
					serializedState = serialize(state);

					// if state had changed since getInitialState started
					// then merge it into the initial state returned
					if (currentState !== SERIALIZED_EMPTY_OBJECT) {
						setState(unserialize(currentState));
					}
				}
			}
		},
		
		// return a fresh copy of the state
		getState = function () {
			// initialize state for the first time if necessary
			initState(instance || this);
			
			return unserialize(serializedState);
		},

		// make sure state is an object
		checkState = function (state) {
			if (typeof state !== 'object') {
				throw new TypeError("State must be an object");
			}
		},

		// merge a state object into the existing state object
		setState = function (newState) {
			// make sure newState is an object
			checkState(newState);

			// initialize state if necessary
			initState(this);

			// if the state for this store is already being changed, throw an error
			if (isStateBeingChanged) {
				throw new Error('Hoverboard: Cannot change state during a state change event');
			}

			// keep track that state for this store is currently being changed
			isStateBeingChanged = 1;

			// merge in new properties
			var state = unserialize(serializedState),
				key, i;

			// shallow merge
			for (key in newState) {
				state[key] = newState[key];
			}

			// keep the serialized state around for future use
			serializedState = serialize(state);

			// make a copy for private use
			(instance || this).state = unserialize(serializedState);
			
			try {

				// let everyone know the state has changed
				for (i=0;i < stateListeners.length;i++) {
					stateListeners[i](getState());
				}

			} finally {
				// all done changing the state, even if there was an error
				isStateBeingChanged = 0;
			}
		},

		// allows replacing the state with a new state object
		replaceState = function (newState) {
			// just wipe the state and merge the new one in
			serializedState = SERIALIZED_EMPTY_OBJECT;
			setState(newState);
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

		// internal store, instance of StoreClass
		instance;

	// add a few "official" instance methods
	// providing some functionality to the store
	// Note: this will replace any methods with the same name in StoreClass
	StoreClass.prototype.getState = getState;
	StoreClass.prototype.setState = setState;
	StoreClass.prototype.replaceState = replaceState;

	// instantiate the store class
	instance = new StoreClass();

	// create & expose the api for public use, exposing actions and getState method
	return createApi(instance, addStateListener);
};

})(); // execute immediately
