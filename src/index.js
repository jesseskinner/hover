var Dispatcher = require('flux').Dispatcher;
var dispatcher = new Dispatcher();

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

var serialize = JSON.stringify;
var unserialize = JSON.parse;

var instanceCounter = 0;

// constants
var REGEX_ACTION_METHOD = (/^on[A-Z]/);
var SERIALIZED_EMPTY_OBJECT = '{}';

module.exports = function (StoreClass) {
	StoreClass = createClass(StoreClass);

	var
		// keep track of serialized instance state (to ensure immutability)
		serializedState = null,

		// unique ID to identify this store instance
		id = instanceCounter++,

		// initialize the state the first time we need it
		initState = function (self) {
			if (serializedState !== null) {
				return
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
		
		// return a clone of the state
		getState = function () {
			initState(instance);
			
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

			for (key in newState) {
				state[key] = newState[key];
			}

			// keep the serialized state around for future use
			serializedState = serialize(state);

			// make a copy for private use
			(instance || this).state = unserialize(serializedState);
			
			// let everyone know the state has changed
			emitter.emit(id);
		},

		replaceState = function (newState) {
			// just wipe the state and merge the new one in
			serializedState = SERIALIZED_EMPTY_OBJECT;
			setState(newState);
		},

		// add a state change listener
		addStateListener = function (callback){
			var handler = function () {
				callback(getState());
			}

			emitter.on(id, handler);

			// call it once right away
			handler();

			// return an unsubscribe function specific to this listener
			return function () {
				// only call removeListener once, then destroy the handler
				if (handler) {
					emitter.removeListener(id, handler);
					handler = null;
				}
			};
		},

		api, instance;

	// add a few "official" instance methods
	// providing some functionality to the store
	StoreClass.prototype.getState = getState;
	StoreClass.prototype.setState = setState;
	StoreClass.prototype.replaceState = replaceState;

	// instantiate the store class
	instance = new StoreClass();

	// create an instance property with a clone of the initial state
	instance.state = getState();

	// create & expose the api for public use
	api = createApi(instance, id);

	// add a single public method for getting state (one time or with a listener)
	api.getState = function (callback) {
		if (isFunction(callback)) {
			return addStateListener(callback);
		}

		return getState();
	};

	return api;
}

// create the public API with action methods
function createApi(instance, id) {
	var api = {}, action, method, actionMethod;

	// create actions on the api
	for (method in instance) {
		if (REGEX_ACTION_METHOD.test(method)) {
			action = createAction(id, method);
			actionMethod = getActionMethod(method);

			api[actionMethod] = action;
		}
	}

	// register action listener
	dispatcher.register(function (payload) {
		if (payload.id === id) {
			instance[payload.method].apply(instance, payload.args);
		}
	});
	
	return api;
}

function createAction(id, method) {
	var action = function () {
		var args = Array.prototype.slice.call(arguments, 0);

		dispatcher.dispatch({
			id: id,
			method: method,
			args: args
		});
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