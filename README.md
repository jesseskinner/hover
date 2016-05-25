# Hover

Hover is a very lightweight (anti-gravity?) data store with actions and a state change listener.

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]

[![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]


## Installation

You can use npm to install Hover, or [download the raw file here](https://raw.githubusercontent.com/jesseskinner/hover/master/src/index.js).

For more information, check out the [Concept](#concept), [Usage](#usage), [Documentation](#documentation) and [FAQ](#faq) below.


```
npm install hover

import Hover from 'hover'
```

## Concept

The basic usage of Hover is:

```javascript
// in store.js
import Hover from 'hover'

const actions = {
	increment: (state, amount) => state + amount
}

const initialState = 0

export default Hover(actions, initialState)

// elsewhere
import store from './store'
const state = store.increment(2)
```

You can easily subscribe to state changes with Hover stores. You can pass a callback to the store. Your callback will be called immediately at first, and again whenever the state changes. Here's an example using vanilla DOM scripting to update the page:

```javascript
function renderUserProfile (user) {
	if (user) {
		const root = document.getElementById('user-profile'),
			avatar = root.querySelector('.avatar'),
			name = root.querySelector('.name')

		// use the avatar url as an image source
		avatar.src = user.avatar

		// erase previous contents of name
		while (name.firstChild) {
			name.removeChild(name.firstChild)
		}

		// add name as a text node
		name.appendChild(document.createTextNode(user.name))
	}
}

userStore(renderUserProfile)
```

Here's an example rendering a React component:

```javascript
function renderUserProfile (user) {
	ReactDOM.render(
		<UserProfile user={user} actions={userStore} />,
		document.getElementById('user-profile')
	)
}

userStore(renderUserProfile)
```


## Usage

Here's how you might use Hover to keep track of clicks with a ClickCounter.

```javascript
const actions = {
	click: (state, text) => ({
		value: state.value + 1,
		log: state.log.concat(text)
	}),

	// go back to defaults
	reset: () => initialState
}

const initialState = 0

const ClickCounter = Hover(actions, initialState)

// listen to changes to the state
const unsubscribe = ClickCounter(clickState =>
	document.write(JSON.stringify(clickState) + "<br>"
)

ClickCounter.click('first')
ClickCounter.click('second')

// reset back to zero
ClickCounter.reset()

unsubscribe()

ClickCounter.click("This won't show up")
```

If you run this example, you'll see this:

```javascript
{"value":0,"log":[]}
{"value":1,"log":["first"]}
{"value":2,"log":["first","second"]}
{"value":0,"log":[]}
```

To see how Hover can fit into a larger app, with React and a router, check out the [Hover TodoMVC](http://github.com/jesseskinner/hover-todomvc/).


## Documentation

Hover is a function that takes an actions object and returns a store object.

### Syntax

```javascript
store = Hover(actions[, initialState])
```

#### `actions` object

- Any properties of the actions object will be exposed as methods on the returned `store` object.
- If your state is a plain object, and you return plain objects from your actions, they will be shallow merged together.
- Note that your actions will automatically receive `state` as the first parameter, followed by the arguments you pass in when calling it.

	```javascript
	// store is synchronous, actions are setters
	store = Hover({
		items: (state, items) => ({ items }),
		error: (state, error) => ({ error })
	}, {})

	// load data asynchronously and call actions to change the state
	api.getItems((error, items) => {
		if (error) {
			return store.error(error)
		}

		store.items(items)
	})

	// listen to the state, and respond to it accordingly
	store(state => {
		if (state.items) {
			renderItems(state.items)
		} else if (state.error) {
			alert('Error loading items!')
		}
	})
	```

#### Return value

`store = Hover(actions[, initialState])`

##### `store` object methods

- `store()`

	- Returns the store's current state.

- `unsubscribe = store(function)`

	- Adds a listener to the state of a store.

	- The listener callback will be called immediately, and again whenever the state changed.

    - Returns an unsubscribe function. Call it to stop listening to the state.

		```javascript
		unsubscribe = store(state => console.log(state))

        // stop listening
        unsubscribe()
		```

- `state = store.action(arg0, arg1, ..., argN)`
	- Calls an action handler on the store, passing through any arguments.

		```javascript
		store = Hover({
			add: (state, number) => state + number
		}, 0)

		result = store() // returns 0
		result = store.add(5) // returns 5
		result = store.add(4) // returns 9
		result = store() // returns 9
		```

#### Hover.compose

`Hover.compose` takes a definition and creates a store,
subscribing to any store members of the definition.

`Hover.compose` can take static variables, objects or arrays.

```javascript
// create two stores
const scoreStore = Hover({
    add: (state, score) => state + score
}, 0)
const healthStore = Hover({
    hit: (state, amount) => state - amount
}, 100)

// compose the two stores into a single store
const gameStore = Hover.compose({
    score: scoreStore,

    // create an anonymous store to nest objects
    character: Hover.compose({
        health: healthStore
    })
})

// stores and actions can be accessed with the same structure
gameStore.score.add(2)

gameStore.character.health.hit(1)
```

You can also pass zero or more translate functions after your compose definition,
to automatically translate or map the state every time it gets updated.

These translate functions will receive a `state` argument, and must return the resulting state.

```javascript
// create stores to contain the active and completed todos
const activeTodoStore = Hover.compose(todoStore, todos =>
    todos.filter(todo => todo.completed === false)
)

const completedTodoStore = Hover.compose(todoStore, todos =>
    todos.filter(todo => todo.completed === true)
})
```

## FAQ

*Q: How does Hover handle asynchronous loading of data from an API?*

There are three ways to achieve this. One way is to load the API outside of the store, and call actions to pass in the loading state, data and/or error as it arrives:

```javascript
const store = Hover({
	loading: (state, isLoading) => ({ isLoading }),
	data: (state, data) => ({ data }),
	error: (state, error) => ({ error })
})

store.loading(true)

getDataFromAPI(params, (error, data) => {
	if (error) {
		return store.error(error)
	}

	store.data(data)
})
```

Another way is to make API calls from inside your actions.

```javascript
const store = Hover({
	load: (state, params) => {
		getDataFromAPI(params, (error, data) =>
			store.done(error, data)
		)

		return { isLoading: true, error: null, data: null }
	},
	done: (state, error, data) => (
		{ isLoading: false, error, data }
	)
})

store.load(params)
```

---

*Q: If Hover stores only have a single getter, how can I have something like getById?*

If you have access to a list of items in the state, you can write code to search through the list. You could even have a function like this as a property of the store, before you export it, eg.

```javascript
import Hover from 'hover'

const initialState = [{ id: 1, name: 'one' }, /* etc... */ }

const itemStore = Hover({
	add: (list, item) => list.concat(item)
}, initialState)

// add a helper function to the store
itemStore.getById = id =>
	list.filter(item => item.id === id).pop()

// getAll
const items = itemStore()

// look up a specific item
const item = itemStore.getById(5)

```

---


## Versioning

Hover follows [semver versioning](http://semver.org/). So you can be sure that the API won't change until the next major version.


## Testing

Clone the GitHub repository, run `npm install`, and then run `npm test` to run the tests. Hover has 100% test coverage.


## Contributing

Feel free to [fork this repository on GitHub](https://github.com/jesseskinner/hover/fork), make some changes, and make a [Pull Request](https://github.com/jesseskinner/hover/pulls).

You can also [create an issue](https://github.com/jesseskinner/hover/issues) if you find a bug or want to request a feature.

Any comments and questions are very much welcome as well.


## Author

Jesse Skinner [@JesseSkinner](http://twitter.com/JesseSkinner)


## License

MIT

[coveralls-image]: https://coveralls.io/repos/jesseskinner/hover/badge.png
[coveralls-url]: https://coveralls.io/r/jesseskinner/hover

[npm-url]: https://npmjs.org/package/hover
[downloads-image]: http://img.shields.io/npm/dm/hover.svg
[npm-image]: http://img.shields.io/npm/v/hover.svg
[travis-url]: https://travis-ci.org/jesseskinner/hover
[travis-image]: http://img.shields.io/travis/jesseskinner/hover.svg
[david-dm-url]:https://david-dm.org/jesseskinner/hover
[david-dm-image]:https://david-dm.org/jesseskinner/hover.svg
[david-dm-dev-url]:https://david-dm.org/jesseskinner/hover#info=devDependencies
[david-dm-dev-image]:https://david-dm.org/jesseskinner/hover/dev-status.svg
