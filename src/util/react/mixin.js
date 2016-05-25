/**
	React mixin, for easily subscribing and unsubscribing to a Hover store

	Usage:

		var SubscribeMixin = require('hover/src/util/mixin');

		React.createClass({
			mixins: [
				// this will map the state of myStore to this.state.store
				SubscribeMixin(myStore, 'store')
			],

			render: function () {
				// use this.state.store
			}
		});

	NOTE: Do not reuse a mixin, each mixin should be only used once.
*/
function SubscribeMixin(subscribe, key) {
	var unsubscribe;

	return {
		componentDidMount: function () {
			// this should never happen
			if (unsubscribe) {
				throw new Error('Cannot reuse a mixin.');
			}

			unsubscribe = subscribe(function (data) {
				// by default, use the store's state as the component's state
				var state = data;

				// but if a key is provided, map the data to that key
				if (key) {
					state = {};
					state[key] = data;
				}

				// update the component's state
				this.setState(state);
			}.bind(this));
		},

		componentWillUnmount: function () {
			// call the unsubscribe function returned from store.getState above
			if (unsubscribe) {
				unsubscribe();

				// wipe the unsubscribe, so the mixin can be used again maybe
				unsubscribe = null;
			}
		}
	};
};

// export for CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = SubscribeMixin;
}
