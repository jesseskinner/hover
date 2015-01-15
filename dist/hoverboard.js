var Hoverboard =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var EventEmitter = __webpack_require__(1).EventEmitter;

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

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ }
/******/ ])