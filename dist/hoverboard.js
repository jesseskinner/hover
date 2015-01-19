var Hoverboard = (function(){
'use strict';

// ensure only one action is handled at a time globally
var isActionBeingHandled = 0;

// constants
var REGEX_ACTION_METHOD = (/^on[A-Z]/);

var NOOP = function(){};

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

function isObject(obj) {
	return obj && typeof obj === 'object' && (
		typeof obj.length !== 'number' || !isFunction(obj.splice)
	);
}

// convert an action handler like "onSomeAction" to an action method like "someAction"
function getActionMethod(method) {
	return method.charAt(2).toLowerCase() + method.substring(3);
}

// create a class using an object as a prototype
function createClass(originalClass, initSelf) {
	var newClass = function(){
		initSelf(this);
		
		if (constructor) {
			constructor.apply(this);
		}
	}, original, k, constructor;

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
	var officialState = {},

		// list of state listeners specific to this store instance
		stateListeners = [],

		// used to provide better error message with circular state listening/changing
		isStateBeingChanged = 0,

		// keep track of whether state has ever changed, for initState
		hasStateBeenChanged = 0,

		// initialize the state the first time we need it
		initState = function () {
			// do not allow initState to be called again
			initState = NOOP;

			// use getInitialState if available
			if (isFunction(instance.getInitialState)) {
				var state = instance.getInitialState(),
					currentState = officialState;

				officialState = state;

				// if state had changed since getInitialState started
				// then merge it into the initial state returned
				// this allows setState to be called from getInitialState
				if (hasStateBeenChanged) {
					setState(currentState);
				}
			}
		},
		
		// return a fresh copy of the state
		getState = function () {
			// initialize state for the first time if necessary
			initState();
			
			return userGetState(officialState);
		},

		userGetState = function (state) {
			return state;
		},

		// merge a state object into the existing state object
		setState = function (newState) {
			// initialize state if necessary
			initState();

			// if the state for this store is already being changed, throw an error
			if (isStateBeingChanged) {
				throw new Error('Hoverboard: Cannot change state during a state change event');
			}

			// keep track that state for this store is currently being or has ever changed
			hasStateBeenChanged = isStateBeingChanged = 1;

			// if officialState and newState are objects, merge in new properties
			if (isObject(officialState) && isObject(newState)) {
				var key, i;

				// shallow merge
				for (key in newState) {
					officialState[key] = newState[key];
				}

			// otherwise, just use the newState as official state
			} else {
				officialState = newState;
			}

			// make an internal copy, if necessary
			officialState = getState();

			// make another copy for private use, if necessary
			instance.state = getState();

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
			// just wipe the state
			officialState = null;

			// and merge the new one in
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

	// create a special class based on the function or object provided
	StoreClass = createClass(StoreClass, function(self){
		instance = self;
	});

	// if a custom getState is provided, remember it here
	if (StoreClass.prototype.getState) {
		userGetState = StoreClass.prototype.getState;
	}

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
