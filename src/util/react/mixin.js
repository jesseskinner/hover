/**
	React mixin, for easily subscribing and unsubscribing to a Hoverboard store

	Usage:

		var HoverboardMixin = require('hoverboard/src/util/mixin');

		React.createClass({
			mixins: [
				// this will map the state of myStore to this.state.store
				HoverboardMixin(myStore, 'store')
			],

			render: function () {
				// use this.state.store
			}
		});

	NOTE: Do not reuse a mixin, each mixin should be only used once.
*/
module.exports = function (store, key) {
	var unsubscribe;

	return {
		componentDidMount: function () {
			var self = this;

			// this should never happen
			if (unsubscribe) {
				throw new Error('Cannot reuse a Hoverboard mixin.');
			}

			unsubscribe = store.getState(function (storeState) {
				// by default, use the store's state as the component's state
				var state = storeState;

				// but if a key is provided, map the store's state to that key
				if (key) {
					state = {};
					state[key] = storeState;
				}

				// update the component's state
				self.setState(state);
			});
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