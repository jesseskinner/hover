var Dispatcher = require('flux').Dispatcher;
var dispatcher = new Dispatcher();
var EventEmitter = require('events').EventEmitter;
var actionId = 0;
var actions = [];

module.exports = function (StoreClass) {
	if (!isFunction(StoreClass)) {
		StoreClass = createClass(StoreClass);
	}

	// use getInitialState for state, if it exists
	var state = null,

		emitter = new EventEmitter(),

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

			state = merge(getState(), clone(newState));

			// clone twice, one for private use, one for public use
			this.state = getState();
			api.state = getState();

			// let everyone know the state has changed
			emitter.emit('change');
		},

		listenTo = function (action, callback) {
			if (!action || typeof action.__action_id !== 'number') {
				throw new TypeError("Invalid action");
			}

			actions[action.__action_id].listeners.push(callback);
		},

		// the actual api returned which lets you add a state listener
		api = {},

		addStateListener = function (callback){
			var handler = function () {
				callback(getState());
			}

			emitter.on('change', handler);

			// call it once right away
			handler();

			// return an unsubscribe function specific to this listener
			return function () {
				// only call removeListener once, then destroy the handler
				if (handler) {
					emitter.removeListener('change', handler);
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
	StoreClass.prototype.listenTo = listenTo;

	// instantiate the store class
	instance = new StoreClass();

	// create an instance property with the initial state
	instance.state = getState();

	// create action methods on the api
	createActions(api, instance);

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

function createActions(api, instance) {
	var dispatchToken = dispatcher.register(function (payload) {
		var action = actions[payload.id], index;

		if (action.dispatchToken === dispatchToken) {
			action.method.apply(instance, payload.args);
		
			// call all listeners after processing
			if (action.listeners.length) {
				for (index=0;index < action.listeners.length;index++) {
					action.listeners[index]();
				}
			}
		}
	});

	createActionMethods(api, instance, dispatchToken);
}

function createActionMethods(api, instance, dispatchToken) {
	var action, key, actionMethod, id;

	for (key in instance) {
		if (isActionHandler(key)) {
			id = actionId++;

			action = createAction(id, key);
			actionMethod = getActionMethod(key);

			actions[id] = {
				instance: instance,
				method: instance[key],
				dispatchToken: dispatchToken,
				listeners: []
			};

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

	action.__action_id = id;

	return action;
}

function isFunction(fn) {
	return typeof fn === 'function';
}

function isActionHandler(method) {
	return /^on[A-Z]/.test(method);
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
		if (src.hasOwnProperty(k)) {
			dest[k] = src[k];
		}
	}

	return dest;
}

// create a class using an object as a prototype
function createClass(prototype) {
	var fn = function(){};
	fn.prototype = prototype;
	return fn;
}