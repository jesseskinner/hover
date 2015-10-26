var chai = require('chai');
var expect = chai.expect;
var mixin = require('../../../src/util/react/mixin');

describe('mixin', function () {
	describe('init', function () {
		it('should return an object with two functions', function () {
			var obj = mixin();

			expect(obj.componentDidMount).to.be.a('function');
			expect(obj.componentWillUnmount).to.be.a('function');
		});
	});

	describe('componentDidMount', function () {
		it('should call getState on the store, which calls setState on the component', function () {
			var obj = mixin(function (callback) {
				callback(123);
			});

			obj.setState = function (state) {
				expect(state).to.equal(123);
			};

			obj.componentDidMount();
		});

		it('should also work with a state key', function () {
			var obj = mixin(function (callback) {
				callback(123);
			}, 'key');

			obj.setState = function (state) {
				expect(state.key).to.equal(123);
			};

			obj.componentDidMount();
		});

		it('should not allow a mixin to be reused', function () {
			var obj = mixin(function () {
				return function () {};
			});

			obj.setState = function () {};

			obj.componentDidMount();

			expect(function () {
				// second time should throw error
				obj.componentDidMount();

			}).to.throw('Cannot reuse a mixin.');
		});
	});

	describe('componentWillUnmount', function () {
		it('should call the function returned by getState, only once', function () {
			var called = 0,
				obj = mixin(function () {
					return function () {
						called++;
					};
				});

			obj.componentDidMount();
			obj.componentWillUnmount();
			obj.componentWillUnmount();
			obj.componentWillUnmount();

			expect(called).to.equal(1);
		});
	});
});
