# Hoverboard

A very lightweight [Flux](https://facebook.github.io/flux/) implementation. We're talking anti-gravity here.

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Bower version][bower-image]][bower-url]

[![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]


## Concept

Hoverboard greatly simplifies [Flux](https://facebook.github.io/flux/) while staying true to the concept.

Facebook's Flux Dispatcher is used internally as a singleton to pass calls from the actions to the store. This means you can't get in trouble by calling actions from inside actions.

We also use EventEmitter to automatically emit change events every time a store updates a state.

But you don't have to worry about any of that with Hoverboard, it's all taken care of for you.

Hoverboard() takes a store definition, and returns actions automatically. Hoverboard will create actions for all the action handlers you define. What's an action handler? It's a function that starts with the letters "on" followed by an upper case letter (in regexp speak, `/^on[A-Z]/`). For example, if you have `onSomeAction()`, Hoverboard will automatically create an action called `someAction()`. Any other methods are kept private and won't be exposed to the public, so you can sleep with ease.

Hoverboard also makes it incredibly easy to watch the state of a store. You just call getState, pass in a function, and it'll be called immediately at first, and again whenever the state changes. This works great with React.js, because you can easily re-render your component whenever the store changes its state. Now you can finally ditch those "Controller-Views".

```javascript
UserProfileStore.getState(function (state) {
	var element = React.createElement(UserProfile, state);

	React.render(element, document.body);
});
```

Worried about your state being mutated? Every time `getState` is called, a fresh copy of your state is returned. And every time `setState` is called, a fresh copy is made for you to work with inside the store. So you get the simplicity of JavaScript objects and protection from leaky pointers. Hoverboard uses serialization to destroy any object pointers and keep your state fresher longer.

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

## Documentation

Coming soon...

In the meantime, if you're feeling adventurous, have a look at the [test](https://github.com/jesseskinner/hoverboard/blob/master/test/test.js) or check out the [Hoverboard TodoMVC](http://github.com/jesseskinner/hoverboard-todomvc/) to see Hoverboard in action.


## Contributing

Feel free to [fork this repository on GitHub](https://github.com/jesseskinner/hoverboard/fork), make some changes, and make a [Pull Request](https://github.com/jesseskinner/hoverboard/pulls).

You can also [create an issue](https://github.com/jesseskinner/hoverboard/issues) if you find a bug or want to request a feature.

Any comments and questions are very much welcome as well.


## TODO

- Documentation
- Finalize API for realsies


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
