var chai = require('chai');
var expect = chai.expect;
var Hoverboard = require('../src/index');

describe('hoverboard', function () {
	
	describe('#init', function () {
		
		it('should return an object when passed an object', function () {
			expect(Hoverboard({})).to.be.a('function');
		});

		it('should return a function when passed a function', function () {
			expect(Hoverboard(function(){})).to.be.a('function');
		});

		it('should create actions from an object', function () {
			var store = Hoverboard({
				something: function(){}
			});

			expect(store.something).to.be.a('function');
		});

		it('should create actions from a class', function () {
			var myClass = function(){};
			myClass.prototype.something = function(){};

			var store = Hoverboard(myClass);

			expect(store.something).to.be.a('function');
		});

		it('should create actions from an extended class', function () {
			var ParentClass = function(){};
			ParentClass.prototype.something = function(){};

			var ChildClass = function(){};
			ChildClass.prototype = new ParentClass();

			var store = Hoverboard(ChildClass);

			expect(store.something).to.be.a('function');
		});

		it('should create actions from a module', function () {
			var store = Hoverboard(function(){
				return {
					test: function(){}
				};
			});

			expect(store.test).to.be.a('function');
		});

		it('should not add anything to the original prototype', function () {
			var myClass = function(){};
			var store = Hoverboard(myClass);

			expect(myClass.prototype).to.be.empty;
		});

		it('should not add anything to the original object', function () {
			var obj = {};
			var store = Hoverboard(obj);

			expect(obj).to.be.empty;
		});
	});

	describe('#callbacks', function(){
		it('should be available inside an init function', function () {
			Hoverboard(function (callback) {
				expect(callback).to.be.a('function');
			});
		});

		it('should return empty state object by default', function () {
			expect(Hoverboard({})()).to.be.an('object');
		});

		it('should allow mutation of returned state by default', function () {
			var store = Hoverboard(function (setState) {
				setState({
					test: { deep: true }
				});
			});
			
			store().test.deep = 'bad';

			expect(store().test.deep).to.equal('bad');
		});

		it('should allow functions in state', function () {
			var store = Hoverboard(function (setState) {
				setState({
					fn: function(){}
				});
			});
			
			expect(store().fn).to.be.a('function');
		});

		it('should not be able to cause infinite loop', function () {
			var store = Hoverboard({
				action: function () {
					return function (callback) {
						store(function () {
							callback({ foo: 'bar' });
						}.bind(this));
					};
				}
			});

			expect(store.action).to.throw(Error, /^Hoverboard: Cannot change state during a state change event$/);
		});
	});

	describe('#state', function () {
		it('should not discard mutations between action handlers', function () {
			var store = Hoverboard({
				foo: function (state) {
					state.test = true;
				},
				bar: function (state) {
					expect(state.test).to.be.true;
				}
			});
			
			store.foo();
			store.bar();
		});
	});

	describe('#constructor', function () {
		it('should be passed a callback', function () {
			var store = Hoverboard(function (callback) {
				expect(callback).to.be.a('function');
			});

			store();
		});

		it('should update the state', function () {
			var store = Hoverboard(function (setState) {
				setState({ test: 123 })
			});
			expect(store().test).to.equal(123);
		});

		it('should throw allow state types are are not objects', function () {
			var store = Hoverboard(function (setState) {
				setState(123);
			});

			expect(store()).to.equal(123);
		});

		it('should allow setState to be called', function () {
			var store = Hoverboard(function (setState) {
				setState({
					a: 1, b: 2
				});
			});

			expect(store()).to.eql({ a: 1, b: 2 });
		});
	});

	describe('#setState callback', function () {
		
		it('should be able to be called from constructor', function () {
			var MyClass = function (setState) {
				setState({ test: 123 });
			};

			var store = Hoverboard(MyClass);

			expect(store().test).to.equal(123);
		});

		it('should not share state between class instances', function () {
			var Class = function(){};
			Class.prototype.change = function(value) {
				return function(setState) {
					setState({ value: value });
				};
			};

			var storeA = Hoverboard(Class),
				storeB = Hoverboard(Class);

			storeA.change(true);

			expect(storeB().value).to.be.undefined;
		});

		it('should merge objects', function () {
			var store = Hoverboard(function (setState) {
				setState({ foo: 1 });
				setState({});
			});

			expect(store().foo).to.equal(1);
		});
	});

	describe('#action()', function () {
		
		it('should call an action handler', function (done) {
			var store = Hoverboard({
				action: function () {
					done();
				}
			});

			store.action();
		});

		it('should throw an error if we trigger an action from an action handler', function () {
			var a = Hoverboard({
				test: function () {
					a.test();
				}
			});

			// trigger an infinite loop
			expect(a.test).to.throw(Error, /^Hoverboard: Cannot call action in the middle of an action$/);
		});

		it('should still work with zero, one, two, three or four arguments', function () {
			var store = Hoverboard({
				action: function (state, arg1, arg2, arg3, arg4) {
					return { len: arguments.length - 1 };
				}
			});

			store.action();
			expect(store().len).to.equal(0);

			store.action(1);
			expect(store().len).to.equal(1);

			store.action(1,2);
			expect(store().len).to.equal(2);

			store.action(1,2,3);
			expect(store().len).to.equal(3);

			store.action(1,2,3,4);
			expect(store().len).to.equal(4);
		})

	});

	describe('#getState(function)', function () {
		
		it('should allow state listeners on stores', function (done) {
			var store = Hoverboard({
				update: function (state, newState) {
					return newState;
				}
			});

			store(function (state) {
				if (state.test === 123) {
					done();
				}
			});

			store.update({ test: 123 });
		});

		it('should return an unsubscribe function', function (done) {
			var store = Hoverboard({
					update: function (state, data) {
						return { data: data };
					}
				}),
				
				unsubscribe = store(function (state) {
					if (state.data === 1) {
						throw "I should not be called";
					}
				});

			store(function (state) {
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

		it('should unsubscribe without breaking other listeners', function () {
			var store = Hoverboard({
					update: function (state, data) {
						return { data: data };
					}
				}),

				success = false,

				unsubscribe = store(function (state) {
					if (state.data === 1) {
						unsubscribe();
					}
				});

			store(function (state) {
				if (state.data === 1) {
					success = true;
				}
			});

			// trigger an update
			store.update(1);

			expect(success).to.be.true;
		});

		it('should prevent actions to be called from listeners', function () {
			var store = Hoverboard({
				foo: function () {
					return { a: 1 };
				},
				bar: function () {
				}
			});

			store(function (state) {
				store.bar();
			});

			expect(store.foo).to.throw(Error, /^Hoverboard: Cannot call action in the middle of an action$/);
		});

		it('should allow stores to listen to other stores', function () {
			var StoreClass = function (setState) {
				setState({ number: 0 });

				return {
					update: function (state, number) {
						return { number: number };
					}
				};
			};

			var original = Hoverboard(StoreClass);

			var listener = Hoverboard({
				init: function () {
					return function (setState) {
						original(function (state) {
							if ('number' in state) {
								setState({
									twice: 2 * state.number
								});
							}
						});
					}
				}
			});

			listener.init();

			original.update(5);

			expect(listener().twice).to.equal(10);
		});
	});
});