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

For more information, check out the [Usage](#usage), [Documentation](#documentation) and [FAQ](#faq) below.

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


## FAQ

*Q: Is this really Flux?*

Yes. Flux requires that data flows in one direction, and Hoverboard enforces that.

When you call an action on a store, you can't get back a return value. The only way to get
data out of a store is by calling `getState`. So this ensures that data flows following
the `Action -> Dispatcher -> Store -> View` flow that is central to Flux.

---

*Q: Does Hoverboard depend on React.js? Or can I use ____ instead?*

You can use Hoverboard with any framework or library. It works really well with
React, just because it's simple to pass an entire state object as props to a
component, and have React figure out how to update the DOM efficiently.

That said, Hoverboard can still work with any other method of programming, but you
might have to do more work to decide how to update your views when the state changes.

As other frameworks start adopting React's strategy of updating the DOM, Hoverboard
will be a good fit to use with those frameworks as well.

Check out [virtual-dom](https://github.com/Matt-Esch/virtual-dom) as an alternative
to use React in your projects.

---

*Q: Is Hoverboard isomorphic? Can I use it on a node.js server?*

Yes, it can work on the server. You can add listeners to stores, and render the
page once you have everything you need from the stores. You should probably unsubscribe
from the store listeners once you've rendered the page, so you don't render it twice.

---

*Q: How does Hoverboard handle asynchronous loading of data from an API?*

There are two ways to achieve this. One way is to load the API outside of the store, and call
actions to pass in the loading state, data and/or error as it arrives:

```javascript
var Store = Hoverboard({
	onLoading: function(isLoading) {
		this.setState({ isLoading: isLoading });
	},
	onData: function(data) {
		this.setState({ data: data });
	},
	onError: function(error) {
		this.setState({ error: error });
	}
}
});

Store.loading(true);

getDataFromAPI(function(error, data){
	Store.loading(false);

	if (error) {
		Store.error(error);
	}

	if (data) {
		Store.data(data);
	}
});
```

Another way is to call the API from within your store itself. If you want to
defer API calls until the last minute, a nice place to do this is from your
`getInitialState` function, because it will only be called when the first action
or `getState` call is made.

```javascript
var Store = Hoverboard({
	getInitialState: function() {
		var self = this;

		getDataFromAPI(function(error, data){
			self.setState({ isLoading: false, data: data, error: error });
		});

		return { isLoading: true, data: null, error: null };
	}
});
```

---

*Q: Hold on. There's no global dispatcher and there's no `waitFor`, so are you sure it's really Flux?*

Yes. Ultimately Hoverboard acts as the dispatcher. Every action calls one specific action
handler in one store, so the dispatching is simple. Like Facebook's Dispatcher, Hoverboard
ensures that only one action is handled at a time, and won't allow action handlers to
pass data back to the action caller.

`waitFor` is a mechanism that Facebook's Dispatcher provides to help multiple stores
coordinate their response to a particular action. In Hoverboard, a store doesn't need
to know about which actions were called, or if some asynchronous response triggered
a change. Whenever one store changes, the other can update itself immediately.

How would you avoid using `waitFor` in Hoverboard? Let's compare using an example from the
[Facebook Flux Dispatcher tutorial](http://facebook.github.io/flux/docs/dispatcher.html):

```javascript
var flightDispatcher = new Dispatcher();

// Keeps track of which country is selected
var CountryStore = {country: null};

// Keeps track of which city is selected
var CityStore = {city: null};

// Keeps track of the base flight price of the selected city
var FlightPriceStore = {price: null};

// When a user changes the selected city, we dispatch the payload:
flightDispatcher.dispatch({
  actionType: 'city-update',
  selectedCity: 'paris'
});

// This payload is digested by CityStore:
flightDispatcher.register(function(payload) {
  if (payload.actionType === 'city-update') {
    CityStore.city = payload.selectedCity;
  }
});

// When the user selects a country, we dispatch the payload:
flightDispatcher.dispatch({
  actionType: 'country-update',
  selectedCountry: 'australia'
});

// This payload is digested by both stores:
CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
  if (payload.actionType === 'country-update') {
    CountryStore.country = payload.selectedCountry;
  }
});

// When the callback to update CountryStore is registered, we save a
// reference to the returned token. Using this token with waitFor(),
// we can guarantee that CountryStore is updated before the callback
// that updates CityStore needs to query its data.
CityStore.dispatchToken = flightDispatcher.register(function(payload) {
  if (payload.actionType === 'country-update') {
    // `CountryStore.country` may not be updated.
    flightDispatcher.waitFor([CountryStore.dispatchToken]);
    // `CountryStore.country` is now guaranteed to be updated.

    // Select the default city for the new country
    CityStore.city = getDefaultCityForCountry(CountryStore.country);
  }
});

// The usage of waitFor() can be chained, for example:
FlightPriceStore.dispatchToken =
  flightDispatcher.register(function(payload) {
    switch (payload.actionType) {
      case 'country-update':
      case 'city-update':
        flightDispatcher.waitFor([CityStore.dispatchToken]);
        FlightPriceStore.price =
          getFlightPriceStore(CountryStore.country, CityStore.city);
        break;
  }
});
```

Here's how the same example would work with Hoverboard:

```javascript
// Keeps track of which country is selected
var CountryStore = Hoverboard({
	getInitialState: function () {
		return { country: null };
	},
	onUpdate: function (selectedCountry) {
		this.setState({ country: selectedCountry });
	}
});

// Keeps track of which city is selected
var CityStore = Hoverboard({
	getInitialState: function () {
		var self = this;

		// listen to changes from the CountryStore
		CountryStore.getState(function (state) {
		    // Select the default city for the new country
		    if (state.country) {
				self.setState({
					city: getDefaultCityForCountry(state.country)
				});
			}
		});

		return { city: null };
	},
	onUpdate: function (selectedCity) {
		this.setState({ city: selectedCity });
	}
});

// Keeps track of the base flight price of the selected city
var FlightPriceStore = Hoverboard({
	getInitialState: function(){
		var self = this;

		// called when either country or city change
		function updatePrice() {
			var country = CountryStore.getState().country;
			var city = CityStore.getState().city;

			if (country && city) {
				self.setState({
					price: getFlightPriceStore(country, city)
				});
			}
		}

		// listen to changes from both the country and city stores
		CountryStore.getState(updatePrice);
		CityStore.getState(updatePrice);

		return { price: null };
	} 
});

// When a user changes the selected city, we call an action:
CityStore.update('paris');

// When the user selects a country, we call an action:
CountryStore.update('australia');
```

It's pretty much the same code, just written a different way. In both examples,
the FlightPriceStore waits for the CountryStore and CityStore to change, and the flow
of data moves through the same logic and processes.


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
