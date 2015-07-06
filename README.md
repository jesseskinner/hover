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

Hoverboard() takes a store definition, and returns actions automatically. Hoverboard will create actions for all the action handlers you define.

Hoverboard also makes it incredibly easy to watch the state of a store. You can add a listener by calling the model as a function. Your callback will be called immediately at first, and again whenever the state changes. This works great with React.js, because you can easily re-render your component whenever the store changes its state. Now you can finally ditch those "Controller-Views".

```javascript
UserProfileStore(function (props) {
	React.render(
		<UserProfile ...props />,
		document.getElementById('user-profile')
	);
});
```

Hoverboard was inspired by other Flux implementations, like [Alt](https://github.com/goatslacker/alt), [Reflux](https://github.com/spoike/refluxjs) and [Redux](https://github.com/gaearon/redux). Those libraries are very lightweight, but Hoverboard is practically weightless.

## Usage

Here's how you might use Hoverboard to keep track of clicks with a ClickCounter.

```javascript
var ClickCounter = Hoverboard(function (setState) {
	// private data
    var defaultState = {
		// initial state
		value: 0,
		log: []
	};

	// set the initial state immediately
	setState(defaultState);

	// return an actions object
	return {
		click: function(state, text) {
			return {
				value: state.value + 1,
				log: state.log.concat(text)
			};
		},
		reset: function() {
			// go back to defaults
			return defaultState;
		}
	};
});

// listen to changes to the state
var unsubscribe = ClickCounter(function (clickState) {
	document.write(JSON.stringify(clickState) + "<br>");
});

ClickCounter.click('first');
ClickCounter.click('second');

// re-initialize back to empty state
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
		someAction: function(){
			return { year: 1955 };
		}
	});
	```

	```javascript
	actions = Hoverboard(function(setState){
		setState({ year: 1985 });

		return {
			someAction: function () {
				return { year: '1985b' };
			}
		}
	});
	```

	```javascript
	var StoreClass = function (setState) {
		setState({ year: 2015 });
	};

	StoreClass.prototype.someAction = function(){
		return { year: '2015b' };
	};

	actions = Hoverboard(StoreClass);
	```

##### `store` - user defined properties

- `store.action` (optional)

	- Any methods will be exposed as actions in the returned `actions` object.

		```javascript
		actions = Hoverboard({
			hideItem: function(state, id) {
				var items = state.items;

				if (id in items) {
					items[id].hidden = true;
				}
			
				// return the new state
				return { items: items };
			},

			// can use action to trigger async loading of state
			init: function(state) {
				return function (setState) {
					// can use callback for anything
					setInterval(function () {
						setState({ time: new Date });
					}, 1000);

					// use a promise too
					api.getItems().then(function (result) {
						setState({ items: result });

					}, function (error) {
						setState({ error: error });
					});
				};
			}
		});

		actions.init();

		actions.hideItem("abc");
		```

#### Return value

`Hoverboard(store)` will return an `actions` object.

##### `actions` object methods

- `actions()`

	- Returns the store's current state.

- `unsubscribe = actions(function(state) { /* do stuff */ })`

	- Adds a listener to the state of a store.
	
	- The listener callback will be called immediately, and again whenever the state changed.

    - Returns an unsubscribe function. Call it to stop listening to the state.

		```javascript
		unsubscribe = actions(function(state) {
			alert(state.value);
		});
        
        // stop listening
        unsubscribe();
		```

- `actions.handleSomeAction(arg1, arg2, ..., argN)`

	- Calls an action handler on the store, passing through any arguments.

		```javascript
		actions = Hoverboard({
			notification: function(state, message) {
				alert(message); // 123
			}
		});

		actions.notification(123);
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
page once you have everything you need from the stores. You should probably unsubscribe
from the store listeners once you've rendered the page, so you don't render it twice.

---

*Q: How does Hoverboard handle asynchronous loading of data from an API?*

There are two ways to achieve this. One way is to load the API outside of the store, and call
actions to pass in the loading state, data and/or error as it arrives:

```javascript
var Store = Hoverboard({
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

Another way is to call the API from within your store itself.

```javascript
var Store = Hoverboard(function(setState) {
	setState({ isLoading: true, data: null, error: null });

	getDataFromAPI(function(error, data){
		setState({ isLoading: false, data: data, error: error });
	});
});
```

You could also put the loading code into an action, and only trigger it when you need the data.

---

*Q: If Hoverboard stores only have a single getter, how can I have both getAll and getById?*

You can use actions and state. If you have a list of items, and want to view a single item,
then you might want to have an items property that contains the list, and an item property
that contains the item you need. Something like this:

```javascript
var ItemsStore = Hoverboard({
	items: function (state, items) {
		// update items whenever list of items changes
		return { items: items };
	},

	setFeaturedId: function (state, id) {
		// using underscore for this example for simplicity
		var item = _.find(state.items, { id: id });

		// update featured item whenever ID changes
		return { featured: item };
	}
});

ItemStore.items([{ id: 123 /* ... */ }]);

// getAll
var items = ItemStore().items;

// getById
ItemStore.setFeaturedId(123);
var item = ItemStore().featured;
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
var CountryStore = Hoverboard(function (setState) {
	setState{ country: null });

	return {
		update: function (state, selectedCountry) {
			return { country: selectedCountry };
		}
	};
});

// Keeps track of which city is selected
var CityStore = Hoverboard(function (setState) {
	// listen to the CountryStore
	CountryStore(function (countryState) {
	    // Select the default city for the new country
	    if (countryState.country && state.city === null) {
			setState({
				city: getDefaultCityForCountry(countryState.country)
			});
		}
	});

	setState({ city: null });

	return {
		update: function (state, selectedCity) {
			return { city: selectedCity };
		}
	};
});

// Keeps track of the base flight price of the selected city
var FlightPriceStore = Hoverboard(function (setState) {
	// called when either country or city change
	function updatePrice() {
		var country = CountryStore().country;
		var city = CityStore().city;

		if (country && city) {
			setState({
				price: getFlightPriceStore(country, city)
			});
		}
	}

	setState({ price: null });

	// listen to changes from both the country and city stores
	CountryStore(updatePrice);
	CityStore(updatePrice);
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
