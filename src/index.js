var Dispatcher = require('flux').Dispatcher;
var dispatcher = new Dispatcher();

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

var instanceCounter = 0;
var regexActionMethod = /^on[A-Z]/;

module.exports = function (StoreClass) {
	if (!isFunction(StoreClass)) {
		StoreClass = createClass(StoreClass);
	}

	// use getInitialState for state, if it exists
	var state = null,

		id = instanceCounter++,

		initState = function (self) {
			// use getInitialState if available
			if (isFunction(self.getInitialState)) {
				var state = self.getInitialState();

				checkState(state);

				return state;
			}

			return {};
		},
		
		getState = function () {
			if (state === null) {
				state = initState(instance);
			}

			return clone(state);
		},

		checkState = function (state) {
			// state needs to be an object
			if (typeof state !== 'object') {
				throw new TypeError("State must be an object");
			}
		},

		setState = function (newState) {
			checkState(newState);

			if (state === null) {
				state = initState(this);
			}

			state = merge(getState(), newState);

			// clone for private use
			this.state = getState();
			
			// let everyone know the state has changed
			emitter.emit(id);
		},

		// the actual api returned which lets you add a state listener
		api = {
			__id: id
		},

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

		changeTimeout,

		instance;

	// add a few "official" instance methods
	// providing some functionality to the store
	StoreClass.prototype.setState = setState;
	StoreClass.prototype.getState = getState;

	// instantiate the store class
	instance = new StoreClass();

	// create an instance property with the initial state
	instance.state = getState();

	// create action methods on the api
	createActions(api, instance, id);

	// add a single public method for getting state (one time or with a listener)
	api.getState = function (callback) {
		if (isFunction(callback)) {
			return addStateListener(callback);
		}

		return getState();
	};

	// expose the api for public use
	return api;
};

function createActions(api, instance, id) {
	registerActionListener(instance, id);
	createActionMethods(api, instance, id);
}

function registerActionListener(instance, id) {
	dispatcher.register(function (payload) {
		if (payload.id === id) {
			instance[payload.method].apply(instance, payload.args);
		}
	});
}

function createActionMethods(api, instance, id) {
	var action, method, actionMethod;

	for (method in instance) {
		if (regexActionMethod.test(method)) {
			action = createAction(id, method);
			actionMethod = getActionMethod(method);

			api[actionMethod] = action;
		}
	}
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

// clone an object, only objects and primitives (serializable properties)
// note that we don't want functions in here. no cheating!
function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

// merge properties from src into dest
function merge(dest, src) {
	for (var k in src) {
		dest[k] = src[k];
	}

	return dest;
}

// create a class using an object as a prototype
function createClass(prototype) {
	var fn = function(){};
	fn.prototype = prototype;
	return fn;
}