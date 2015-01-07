var chai = require('chai');
var expect = chai.expect;
var __ = require('../src/index');

describe('hoverboard', function () {
	
	describe('#init', function () {
		
		it('should return an object when passed an object', function () {
			expect(__({})).to.be.an('object');
		});

		it('should return an object when passed a function', function () {
			expect(__(function(){})).to.be.an('object');
		});

		it('should create actions from an object', function () {
			var store = __({
				onSomething: function(){}
			});

			expect(store.something).to.be.a('function');
		});

		it('should create actions from a class', function () {
			var myClass = function(){};
			myClass.prototype.onSomething = function(){};

			var store = __(myClass);

			expect(store.something).to.be.a('function');
		});

		it('should create actions from an extended class', function () {
			var ParentClass = function(){};
			ParentClass.prototype.onSomething = function(){};

			var ChildClass = function(){};
			ChildClass.prototype = new ParentClass();

			var store = __(ChildClass);

			expect(store.something).to.be.a('function');
		});
	});

	describe('#getState', function(){
		it('should return empty state object by default', function () {
			expect(__({}).getState()).to.be.an('object');
		});

		it('should contain initial state from getInitialState', function () {
			var store = __({
				getInitialState: function () {
					return { test: 123 }
				}
			});
			expect(store.getState().test).to.equal(123);
		});

		it('should not allow mutation of returned state', function () {
			var store = __({
				getInitialState: function () {
					return {
						test: { deep: true }
					};
				}
			});
			
			store.getState().test.deep = 'bad';

			expect(store.getState().test.deep).to.equal(true);
		});

		it('should not allow functions in state', function () {
			var store = __({
				getInitialState: function () {
					return {
						fn: function(){}
					};
				}
			});
			
			expect(store.getState().fn).to.be.undefined;
		});

		it('should throw TypeError if state is not an object', function () {
			function makeStore(){
				var store = __({
					getInitialState: function () {
						return 123;
					}
				});
			}
			
			expect(makeStore).to.throw(TypeError);
		});
	});

	describe('#setState({})', function () {
		
		it('should be able to be called from constructor', function () {
			var MyClass = function () {
				this.setState({ test: 123 });
			};

			var store = __(MyClass);

			expect(store.getState().test).to.equal(123);
		});

		it('should merge properties', function () {
			var MyClass = function () {
				this.setState({
					b: 3,
					c: 4
				});
			};
			MyClass.prototype.getInitialState = function () {
				return {
					a: 1,
					b: 2
				};
			};

			var store = __(MyClass),
				state = store.getState();

			expect(state).to.eql({ a: 1, b: 3, c: 4 });
		});

		it('should not be public', function () {
			var store = __({});

			expect(store.setState).to.be.undefined;
		});

		it('should not share state between class instances', function () {
			var Class = function(){};
			Class.prototype.onChange = function(value) {
				this.setState({ value: value });
			};

			var storeA = __(Class),
				storeB = __(Class);

			storeA.change(true);

			expect(storeB.getState().value).to.be.undefined;
		});

		it('should destroy any internal mutation of state', function () {
			var store = __(function () {
				this.setState({ foo: 1 });

				this.state.foo = 2;
				
				this.setState({});

				expect(this.state.foo).to.equal(1);
			});
			
		});
	});

	describe('#replaceState', function () {
		it('should not be public', function () {
			var store = __({});

			expect(store.replaceState).to.be.undefined;
		});

		it('should replace the state', function () {
			var store = __({
				getInitialState: function () {
					return {
						a: 1
					};
				},
				onInit: function () {
					this.replaceState({ b: 2 });
				}
			});

			store.init();

			expect(store.getState()).to.eql({ b: 2 });
		});
	});

	describe('#action()', function () {
		
		it('should call an action handler', function (done) {
			var store = __({
				onAction: function () {
					done();
				}
			});

			store.action();
		});

		it('should throw an error if we trigger an action from an action handler', function () {
			var a = __({
				onTest: function () {
					a.test();
				}
			});

			// trigger an infinite loop
			expect(a.test).to.throw(Error);
		});

	});

	describe('#getState(function)', function () {
		
		it('should allow state listeners on stores', function (done) {
			var store = __({
				onUpdate: function (state) {
					this.setState(state);
				}
			});

			store.getState(function (state) {
				if (state.test === 123) {
					done();
				}
			});

			store.update({ test: 123 });
		});

		it('should return an unsubscribe function', function (done) {
			var store = __({
					onUpdate: function (data) {
						this.setState({ data: data });
					}
				}),
				
				unsubscribe = store.getState(function (state) {
					if (state.data === 1) {
						throw "I should not be called";
					}
				});

			store.getState(function (state) {
				// this should be called
				if (state.data === 1) {
					done();
				}
			});

			// unsubscribe the first one
			unsubscribe();

			// second time does nothing
			unsubscribe();

			// trigger an update
			store.update(1);
		});

		it('should prevent actions to be called from listeners', function () {
			var store = __({
				onFoo: function () {
					this.setState({});
				},
				onBar: function () {
				}
			});

			store.getState(function (state) {
				store.bar();
			});

			expect(function () {
				store.foo();
			}).to.throw(Error);
		});

		it('should allow stores to listen to other stores', function () {
			var original = __({
				onUpdate: function (number) {
					this.setState({ number: number });
				}
			});

			var listener = __({
				onInit: function () {
					original.getState(function (state) {
						this.setState({
							twice: 2 * state.number
						});
					}.bind(this));
				}
			});

			listener.init();

			original.update(5);

			expect(listener.getState().twice).to.equal(10);
		});

		it('should throw an error on an invalid store', function () {
			expect(function(){
				__(function(){
					this.listenTo(function(){});
				});
			}).to.throw(TypeError);
		});
	});
});