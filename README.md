# Hoverboard

A very lightweight (anti-gravity?) data model and [Flux](https://facebook.github.io/flux/) store with actions and a state change listener.

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Bower version][bower-image]][bower-url]

[![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]


## Installation

You can use either npm or bower to install Hoverboard, or [download the standalone files here](https://github.com/jesseskinner/hoverboard/tree/master/dist).

```
npm install hoverboard
```

```
bower install hoverboard-flux
```

## Concept

Hoverboard greatly simplifies [Flux](https://facebook.github.io/flux/) while staying true to the concept.

Hoverboard() takes a store definition, and returns actions automatically. Hoverboard will create actions for all the action handlers you define. What's an action handler? It's a function that starts with the letters "on" followed by an upper case letter (in regexp speak, `/^on[A-Z]/`). For example, if you have `onSomeAction()`, Hoverboard will automatically create an action called `someAction()`. Any other methods are kept private and won't be exposed to the public, so you can sleep with ease.

Hoverboard also makes it incredibly easy to watch the state of a store. You just call getState, pass in a function, and it'll be called immediately at first, and again whenever the state changes. This works great with React.js, because you can easily re-render your component whenever the store changes its state. Now you can finally ditch those "Controller-Views".

```javascript
UserProfileStore.getState(function (state) {
	var element = React.createElement(UserProfile, state);

	React.render(element, document.body);
});
```

Worried about your state being mutated? Every time `getState` is called, a fresh copy of your state is returned. And every time `setState` is called, or an action handler is called, a fresh copy is made for you to work with inside the store. So you get the simplicity of JavaScript objects and protection from leaky pointers. Hoverboard uses serialization to destroy any object pointers and keep your state fresher longer.

Hoverboard was inspired by other Flux implementations, like [Alt](https://github.com/goatslacker/alt) and [Reflux](https://github.com/spoike/refluxjs). Those versions are very lightweight, but Hoverboard is practically weightless.


## Usage

The following example uses pretty much all of Hoverboard's functionality.

```javascript
var ClickCounter = Hoverboard({
	getInitialState: function () {
		return {
			value: 0,
			log: []
		};
	},
	onClick: function (text) {
		this.state.value++;
		this.state.log.push(text);

		// need to call setState to make it permanent & notify listeners
		this.setState(this.state);
	},
	onReset: function () {
		this.replaceState(this.getInitialState());
	}
});

// listen to changes to the state
var unsubscribe = ClickCounter.getState(function(clickState){
	document.write(JSON.stringify(clickState) + "<br>");
});

ClickCounter.click('first');
ClickCounter.click('second');
ClickCounter.reset();

unsubscribe();

ClickCounter.click("This won't show up");
```

If you run this example, you'll see this:

```javascript
{"value":0,"log":[]}
{"value":1,"log":["first"]}
{"value":2,"log":["first","second"]}
{"value":0,"log":[]}
```

To see how Hoverboard fits into a larger app, with ReactJS and a router, check out the [Hoverboard TodoMVC](http://github.com/jesseskinner/hoverboard-todomvc/).


## Documentation

Hoverboard is a function that takes a store as a single parameter, either an object or a function, and returns an object containing actions.

### Syntax

```javascript
actions = Hoverboard(store);
```

#### `store` parameter

`store` can either be an object or a function.

- If passed a function, Hoverboard will create the store by instantiating the function with `new store()`.

- If passed an object, Hoverboard will set the object as the `prototype` of an empty function, and instantiate that.

- Either way, your store will end up as an instance of a function.

	```javascript
	actions = Hoverboard({
		onSomeAction: function(){
			this.setState({ year: 1955 });
		}
	});
	```

	```javascript
	actions = Hoverboard(function(){
		this.setState({ year: 1985 });
	});
	```

	```javascript
	var StoreClass = function(){};

	StoreClass.prototype.onSomeAction = function(){
		this.setState({ year: 2015 });
	};

	actions = Hoverboard(StoreClass);
	```

##### `store` - user defined properties

- `store.getInitialState` (optional)

	- Must return an object containing the initial state for the store.

	- Will not be called until `getState` is called, or an action is handled. So it can be a good place to start loading data from an API.

	- Note: the state must be serializable. This means you cannot have functions or classes in your state.

		```javascript
		actions = Hoverboard({
			getInitialState: function(){
				return { list: [] };
			}
		});
		```

- `store.onHandleSomeAction` (optional)

	- Any methods with a name like `onFooBar()` (matching `/^on[A-Z]/`) are action handlers, and will be exposed as actions in the returned `actions` object. So `onaction()` will **not** be turned into an action, but `onAction()` will.

	- Specifically, the action names will not have the "on" at the start, and the first character will be lower-case. So `onFooBar()` will be accessible as `fooBar()`.

	- Note: actions cannot be called from other actions, even actions in different stores.

		```javascript
		actions = Hoverboard({
			onAddItem: function(text){
				// add item to database
			}
		});

		actions.addItem("abc");
		```

##### `store` internal methods and properties

- `this.state` - object property

	- Contains a copy of the current state object. A new copy is made every time `setState` or an action handler are called.

	- If you make changes to `this.state`, they will not affect the store's state. Be sure to use `this.setState(state)` to save the state.

	- Note: `this.state` is not available in the function constructor of a `store`. Use `this.getState()` here instead.

		```javascript
		Hoverboard({
			onSomeAction: function(){
				this.state.newValue = 123;
				this.setState(this.state);
			}
		});
		```
		
- `this.getState()`

	- Returns the current state object. Similar to accessing `this.state`.

		```javascript
		Hoverboard(function(){
			var state = this.getState();
			state.newValue = 123;
			this.setState(state);
		});
		```

- `this.setState(partialState)`

	- Updates the store's state, merging the properties in `partialState` to the store's state.

	- Note: the state must be serializable. This means you cannot have functions or classes in your state.

		```javascript
		Hoverboard({
			getInitialState: function(){
				return { sky: 'blue' };
			},
			onSomeAction: function(){
				this.setState({ grass: 'green' });

				// this.state is now: { sky: 'blue', grass: 'green' }
			}
		});
		```

- `this.replaceState(newState)`

	- Replaces the store's state with `newState` object.

	- Similar to `setState` except it erases the previous state before updating.

	- Note: the state must be serializable. This means you cannot have functions or classes in your state.

		```javascript
		Hoverboard({
			getInitialState: function(){
				return { sky: 'blue' };
			},
			onSomeAction: function(){
				this.replaceState({ grass: 'green' });

				// this.state is now: { grass: 'green' }
			}
		});
		```

#### Return value

`Hoverboard(store)` will return an `actions` object.

##### `actions` object methods

- `actions.getState()`

	- Returns a copy of the store's current state.

		```javascript
		state = actions.getState();
		```

- `unsubscribe = actions.getState(function(state) {})`

	- Adds a listener to the state of a store.
	
	- The listener callback will be called immediately, and again whenever the state changed.

    - Returns an unsubscribe function. Call it to stop listening to the state.

		```javascript
		unsubscribe = actions.getState(function(state) {
			alert(state.value);
		});
        
        // stop listening
        unsubscribe();
		```

- `actions.handleSomeAction(arg1, arg2, ..., argN)`

	- Calls an action handler on the store, passing through any arguments.

	- Only created for action handlers with a name like onAction (matching `/^on[A-Z]/`).
	
		```javascript
		actions = Hoverboard({
			onNotification: function(message) {
				alert(message); // 123
			}
		});

		actions.notification(123);
		```


## Versioning

Hoverboard follows [semver versioning](http://semver.org/). So you can be sure that the API won't change until the next major version.


## Testing

Clone the GitHub repository, run `npm install`, and then run `mocha` to run the tests. Hoverboard has 100% test coverage.


## Contributing

Feel free to [fork this repository on GitHub](https://github.com/jesseskinner/hoverboard/fork), make some changes, and make a [Pull Request](https://github.com/jesseskinner/hoverboard/pulls).

You can also [create an issue](https://github.com/jesseskinner/hoverboard/issues) if you find a bug or want to request a feature.

Any comments and questions are very much welcome as well.


## Author

Jesse Skinner [@JesseSkinner](http://twitter.com/JesseSkinner)


## License

MIT

[coveralls-image]: https://coveralls.io/repos/jesseskinner/hoverboard/badge.png
[coveralls-url]: https://coveralls.io/r/jesseskinner/hoverboard

[npm-url]: https://npmjs.org/package/hoverboard
[downloads-image]: http://img.shields.io/npm/dm/hoverboard.svg
[npm-image]: http://img.shields.io/npm/v/hoverboard.svg
[travis-url]: https://travis-ci.org/jesseskinner/hoverboard
[travis-image]: http://img.shields.io/travis/jesseskinner/hoverboard.svg
[david-dm-url]:https://david-dm.org/jesseskinner/hoverboard
[david-dm-image]:https://david-dm.org/jesseskinner/hoverboard.svg
[david-dm-dev-url]:https://david-dm.org/jesseskinner/hoverboard#info=devDependencies
[david-dm-dev-image]:https://david-dm.org/jesseskinner/hoverboard/dev-status.svg
[bower-url]:http://badge.fury.io/bo/hoverboard-flux
[bower-image]: https://badge.fury.io/bo/hoverboard-flux.svg
