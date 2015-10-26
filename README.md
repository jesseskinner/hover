# Hoverboard

A very lightweight (anti-gravity?) data model and [Flux](https://facebook.github.io/flux/) store with actions and a state change listener.

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Bower version][bower-image]][bower-url]

[![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]


## Installation

You can use either npm or bower to install Hoverboard, or [download the standalone files here](https://github.com/jesseskinner/hoverboard/tree/master/dist).

For more information, check out the [Concept](#concept), [Usage](#usage), [Documentation](#documentation) and [FAQ](#faq) below.


```
npm install hoverboard
```

```
bower install hoverboard-flux
```

## Concept

Hoverboard greatly simplifies [Flux](https://facebook.github.io/flux/) while staying true to the concept.

The basic usage of Hoverboard is:

```javascript
var store = Hoverboard(actions);
```

Hoverboard makes it incredibly easy to subscribe to state changes. You can add a listener by calling the model as a function. Your callback will be called immediately at first, and again whenever the state changes. This works great with React.js, because you can easily re-render your component whenever the store changes its state. You can keep your components stateless, and ditch those "Controller-Views".

```javascript
store.getState(function (props) {
	React.render(
		<UserProfile {...props} actions={actions} />,
		document.getElementById('user-profile')
	);
});
```

Worried about your state being mutated? Hoverboard will always create a copy of your state using
a shallow merge before passing to your store's subscribers or action reducers.

Hoverboard was inspired by other Flux implementations, like [Redux](https://github.com/reakt/redux), [Alt](https://github.com/goatslacker/alt) and [Reflux](https://github.com/spoike/refluxjs). Those versions are very lightweight, but Hoverboard is practically weightless.

## Usage

Here's how you might use Hoverboard to keep track of clicks with a ClickCounter.

```javascript
var ClickCounter = Hoverboard({
	click: function(state, text) {
		return {
			value: state.value + 1,
			log: state.log.concat(text)
		};
	},
	reset: function() {
		// go back to defaults
		return {
			value: 0,
			log: []
		};
	}
});

// initialize with defaults
ClickCounter.reset();

// listen to changes to the state
var unsubscribe = ClickCounter(function (clickState) {
	document.write(JSON.stringify(clickState) + "<br>");
});

ClickCounter.click('first');
ClickCounter.click('second');

// reset back to empty state
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
store = Hoverboard(actions);
```

#### `actions` parameter

- Any properties of the actions object will be exposed as methods on the returned `store` object.
- Note that the actions will receive `state` as the first parameter, but the methods do not.

	```javascript
	actions = Hoverboard({
		hideItem: function(state, id) {
			var items = state.items;

			items[id].hidden = true;
		
			// return the new state
			return { items: items };
		},

		items: function(state, items) {
			return { items: items };
		},

		error: function(state, error) {
			return { error: error };
		}
	});

	// you could load the store contents asynchronously and pass in as action
	api.getItems(function (error, items) {
		if (error) {
			return actions.error(error);
		}

		actions.items(items);
	});

	// later
	actions.hideItem("abc");
	```

#### Return value

`Hoverboard(actions)` will return a `store` object.

##### `store` object methods

- `store.getState()` or `store()`

	- Returns the store's current state.

- `unsubscribe = store.getState(function)` or `unsubscribe = store(function)`

	- Adds a listener to the state of a store.
	
	- The listener callback will be called immediately, and again whenever the state changed.

    - Returns an unsubscribe function. Call it to stop listening to the state.

		```javascript
		unsubscribe = store.getState(function(state) {
			alert(state.value);
		});
        
        // stop listening
        unsubscribe();
		```

- `store.handleSomeAction(arg1, arg2, ..., argN)`

	- Calls an action handler on the store, passing through any arguments.

		```javascript
		store = Hoverboard({
			add: function(state, number) {
				return state + number;
			},
			reset: function() {
				return 0;
			}
		});

		// start off at zero
		store.reset();

		store.add(5);
		store.add(4);

		result = store.getState(); // returns 9
		```


## FAQ

*Q: Is this really Flux?*

Yes. Flux requires that data flows in one direction, and Hoverboard enforces that.

When you call an action on a store, you can't get back a return value. The only way to get
data out of a store is by registering a change listener. So this ensures that data flows following
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
to using React in your projects.

---

*Q: Is Hoverboard universal? Can I use it on a node.js server?*

Yes, it can work on the server. You can add listeners to stores, and render the
page once you have everything you need from the stores. To be safe, you should probably unsubscribe from the store listeners once you've rendered the page, so you don't render it twice.

If you want to be able to "re-hydrate" your stores after rendering on the server, you can
add a simple action to do so like the following:

```javascript
store = Hoverboard({
	rehydrate: function (state, newState) {
		return newState;
	}
});

store.rehydrate(storeData);
```

---

*Q: How does Hoverboard handle asynchronous loading of data from an API?*

There are two ways to achieve this. One way is to load the API outside of the store, and call actions to pass in the loading state, data and/or error as it arrives:

```javascript
var store = Hoverboard({
	loading: function(state, isLoading) {
		return { isLoading: isLoading };
	},
	data: function(state, data) {
		return { data: data };
	},
	error: function(state, error) {
		return { error: error };
	}
});

store.loading(true);

getDataFromAPI(params, function(error, data){
	store.loading(false);

	if (error) {
		return store.error(error);
	}

	store.data(data);
});
```

Another way is to call the API from within your store itself.

```javascript
var store = Hoverboard({
	load: function (state, params) {
		getDataFromAPI(params, function (error, data) {
			store.done(error, data);
		});

		return { isLoading: true, error: null, data: null };
	},
	done: function(state, error, data) {
		return { isLoading: false, error: error, data: data };
	}
});

store.load(params);
```

You could also put the loading code into an action, and only trigger it when you need the data.

---

*Q: If Hoverboard stores only have a single getter, how can I have both getAll and getById?*

You can use actions and state. If you have a list of items, and want to view a single item,
then you might want to have an items property that contains the list, and an item property
that contains the item you need. Something like this:

```javascript
var itemStore = Hoverboard({
	init: function (state, data) {
		return data;
	},
	// update item whenever ID changes
	viewById: function (state, id) {
		return {
			item: state.items[id],
			items: state.items
		};
	},
	viewAll: function (state) {
		return {
			items: state.items
		}
	}
});

// initalize with data
itemStore.init({ abc: 123, /* etc... */ });

// getAll
var items = itemStore().items;

// getById
itemStore.viewById(123);

var state = itemStore.getState();

if (state.item) {
	// render single item
} else {
	// render list of items
}
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

Here's how the example from the link above would work with Hoverboard:

```javascript
// Keeps track of which country is selected
var CountryStore = Hoverboard({
	init: function () {
		return { country: null }
	},
	update: function (state, selectedCountry) {
		return { country: selectedCountry };
	}
});
CountryStore.init();

// Keeps track of which city is selected
var CityStore = Hoverboard({
	init: function () {
		return { city: null };
	},
	update: function (state, selectedCity) {
		return { city: selectedCity };
	}
});
CityStore.init();

// listen to the CountryStore
CountryStore(function (countryState) {
    // Select the default city for the new country
    if (countryState.country && CityStore.getState().city === null) {
		CityStore.update(getDefaultCityForCountry(countryState.country));
	}
});

// Keeps track of the base flight price of the selected city
var FlightPriceStore = Hoverboard({
	init: function () {
		return { price: null }
	},
	updatePrice: function (state, country, city) {
		if (country && city) {
			return {
				price: getFlightPriceStore(country, city)
			};
		}
	}
});
FlightPriceStore.init();

// called when either country or city change
function updateFlightPrice() {
	var country = CountryStore().country;
	var city = CityStore().city;

	FlightPriceStore.updatePrice(country, city);
}

// listen to changes from both the country and city stores
CountryStore(updateFlightPrice);
CityStore(updateFlightPrice);

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
