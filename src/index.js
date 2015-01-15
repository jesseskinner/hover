var EventEmitter = require('events').EventEmitter;

var serialize = JSON.stringify;
var unserialize = JSON.parse;

var isActionBeingHandled = 0;

// constants
var REGEX_ACTION_METHOD = (/^on[A-Z]/);
var SERIALIZED_EMPTY_OBJECT = '{}';

module.exports = function (StoreClass) {
	StoreClass = createClass(StoreClass);

	var
		// keep track of serialized instance state (to ensure immutability)
		serializedState = null,

		emitter = new EventEmitter(),

		// initialize the state the first time we need it
		initState = function (self) {
			if (serializedState !== null) {
				return;
			}

			// use getInitialState if available
			if (isFunction(self.getInitialState)) {
				var state = self.getInitialState();

				checkState(state);

				serializedState = serialize(state);
			
			} else {
				serializedState = SERIALIZED_EMPTY_OBJECT;
			
			}
		},
		
		// return a fresh copy of the state
		getState = function () {
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
			checkState(newState);
			initState(this);

			// merge in new properties
			var state = unserialize(serializedState),
				key;

			// shallow merge
			for (key in newState) {
				state[key] = newState[key];
			}

			// keep the serialized state around for future use
			serializedState = serialize(state);

			// make a copy for private use
			(instance || this).state = unserialize(serializedState);
			
			// let everyone know the state has changed
			emitter.emit(0);
		},

		replaceState = function (newState) {
			// just wipe the state and merge the new one in
			serializedState = SERIALIZED_EMPTY_OBJECT;
			setState(newState);
		},

		// add a state change listener
		addStateListener = function (callback){
			// create a handler that will pass the state in to callback
			var handler = function () {
				callback(getState());
			};

			// add handler as listener to change event
			emitter.on(0, handler);

			// call handler right away
			handler();

			// return an unsubscribe function specific to this listener
			return function () {
				// only call removeListener once, then destroy the handler
				if (handler) {
					emitter.removeListener(0, handler);
					handler = null;
				}
			};
		},

		// external api for this store, exposing actions and getState method
		api,

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

	// create & expose the api for public use
	api = createApi(instance, addStateListener);

	return api;
}

// create the public API with action methods
function createApi(instance, addStateListener) {
	var api = {}, action, method, actionMethod;

	// create actions on the api
	for (method in instance) {
		if (REGEX_ACTION_METHOD.test(method)) {
			action = createAction(instance, method);
			actionMethod = getActionMethod(method);

			api[actionMethod] = action;
		}
	}

	// add a single public method for getting state (one time or with a listener)
	api.getState = function (callback) {
		if (isFunction(callback)) {
			return addStateListener(callback);
		}

		return instance.getState();
	};

	return api;
}

function createAction(instance, method) {
	var action = function (a,b,c,d,e,f) {
		// prevent a subsequent action being called during an action
		if (isActionBeingHandled) {
			throw new Error('Hoverboard: Cannot call action in the middle of an action');
		}

		// remember that we're in the middle of an action
		isActionBeingHandled = 1;

		// create a copy of the state for local use
		instance.state = instance.getState();

		try {
			// actually call the action directly. try to avoid use of apply for common cases
			if (arguments.length < 7) {
				instance[method](a,b,c,d,e,f);
			} else {
				instance[method].apply(instance, arguments);
			}

		} finally {
			// whether or not there was an error, we're done here
			isActionBeingHandled = 0;
		}
	};

	return action;
}

function isFunction(fn) {
	return typeof fn === 'function';
}

function getActionMethod(method) {
	return method.charAt(2).toLowerCase() + method.substring(3);
}

// create a class using an object as a prototype
function createClass(StoreClass) {
	var copy = {}, original;

	if (isFunction(StoreClass)) {
		original = StoreClass.prototype;
	} else {
		// should be an object
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