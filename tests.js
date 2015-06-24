var expect = require("chai").expect;
var Observable = require("./prescription/observable");
var Disposable = require("./prescription/disposable");
var NOOP = function() {};

describe("Observable", function() {
    describe("Basics", function() {
        var observable;
        beforeEach(function() {
            observable = new Observable.prototype.fromArray([1, 2, 3, 4, 5]);
        })

        it("Has a subscribe", function() {
            expect(observable.subscribe).to.exist;
        })

        it("Returns a disposable on subscribe", function() {
            observable = new Observable(function() {
                return new Disposable(NOOP);
            })

            var subscription = observable.subscribe(NOOP);

            expect(subscription.isDisposed).to.exist;
        })

        it("Executes dispose only once", function() {
            var results = [];

            observable = new Observable(function() {
                return new Disposable(function() {
                    results.push(true);
                });
            })

            var subscription = observable.subscribe(NOOP);
            subscription.dispose();
            subscription.dispose();

            expect(results).to.deep.equal([true]);
        })

        it("Calls onNext", function(done) {
            var results = [];

            observable
                .map(function(value) { return value + 5; })
                .subscribe(function(value) {
                    results.push(value);
                });

            setTimeout(function() {
                expect(results).to.deep.equal([6, 7, 8, 9, 10]);
                done();
            }, 0)
        })

        it("Calls onError", function(done) {
            var results = [];

            observable
                .map(function(value) {
                    return value.toBad();
                })
                .subscribe(
                    NOOP,
                    function(exception) {
                        var result = exception.message.indexOf("toBad") !== -1;
                        results.push(result);
                    },
                    NOOP
                );

            setTimeout(function() {
                expect(results).to.deep.equal([true, true, true, true, true]);
                done();
            }, 0)
        })

        it("Calls onComplete", function(done) {
            var result = false;

            observable
                .map(function(value) { return value + 5; })
                .subscribe(
                    NOOP,
                    NOOP,
                    function() {
                        result = true;
                    }
                );

            setTimeout(function() {
                expect(result).to.equal(true);
                done();
            }, 0);
        })
    })

    describe("Map", function() {
        var observable;
        beforeEach(function() {
            observable = new Observable.prototype.fromArray([1, 2, 3, 4, 5]);
        })

        it("Calls onNext", function(done) {
            var results = [];

            observable
                .map(function(value) { return value + 5; })
                .subscribe(function(value) {
                    results.push(value);
                });

            setTimeout(function() {
                expect(results).to.deep.equal([6, 7, 8, 9, 10]);
                done();
            });
        })

        it("Calls and forwards onError", function(done) {
            var results = [];

            observable
                .map(function(value) { return value.toBadProperty(); })
                .map(function(value) { return value + 2; })
                .subscribe(
                    NOOP,
                    function(error) {
                        results.push(error.message.indexOf("toBadProperty") !== -1);
                    }
                );

            setTimeout(function() {
                expect(results).to.deep.equal([true, true, true, true, true]);
                done();
            });
        })

        it("Forwards onComplete", function(done) {
            var result = false;

            observable
                .map(function(value) { return value + 2 })
                .subscribe(
                    NOOP,
                    NOOP,
                    function() {
                        result = true;
                    }
                );

            setTimeout(function() {
                expect(result).to.equal(true);
                done();
            });
        })
    })

    describe("Reduce", function() {
        var observable;
        beforeEach(function() {
            observable = new Observable.prototype.fromArray([1, 2, 3, 4, 5]);
        })

        it("Collapses a series to one value", function(done) {
            var result;

            observable
                .reduce(function(accumulator, item) {
                    if (!accumulator) return item;
                    return accumulator + item;
                })
                .subscribe(function(value) {
                    result = value;
                });

            setTimeout(function() {
                expect(result).to.equal(15);
                done();
            })
        })

        it("Takes a seed value", function(done) {
            var result;

            observable
                .reduce(function(accumulator, item) {
                    if (!accumulator) return item;
                    return accumulator + item;
                }, 10)
                .subscribe(function(value) {
                    result = value;
                });

            setTimeout(function() {
                expect(result).to.equal(25);
                done();
            })
        })

        it("Calls and forwards onError", function(done) {
            var results = [];

            observable
                .reduce(function(acc, value) { return value.toBadProperty(); })
                .reduce(function(acc, item) { return acc + item; }, 0)
                .subscribe(
                    NOOP,
                    function(error) {
                        results.push(error.message.indexOf("toBadProperty") !== -1);
                    }
                );

            setTimeout(function() {
                expect(results).to.deep.equal([true, true, true, true, true]);
                done();
            });
        })

        it("Forwards onComplete", function(done) {
            var result = false;

            observable
                .reduce(function(acc, item) { return acc + item }, 0)
                .subscribe(
                    NOOP,
                    NOOP,
                    function() {
                        result = true;
                    }
                );

            setTimeout(function() {
                expect(result).to.equal(true);
                done();
            });
        })
    })

    describe("Retry", function() {
        var observable,
            retries;
        beforeEach(function() {
            retries = [];
            observable = new Observable(function(observer) {
                var timeout = setTimeout(function() {
                    observer.onError(true);
                    retries.push(true);
                }, 5);

                return new Disposable(function() {
                    clearTimeout(timeout);
                })
            })
        })

        it("Can be disposed", function(done) {
            var results = [];

            var subscription =
                observable
                    .retry(1)
                    .subscribe(
                        NOOP,
                        function(value) {
                            results.push(value);
                        }
                    );

            subscription.dispose();

            setTimeout(function() {
                expect(results).to.deep.equal([]);
                expect(retries).to.deep.equal([]);
                done();
            }, 50)
        })

        it("Executes limit plus one times", function(done) {
            var results = [];

            var subscription =
                observable
                    .retry(3)
                    .subscribe(
                        NOOP,
                        function(value) {
                            results.push(value);
                        }
                    );

            setTimeout(function() {
                expect(results).to.deep.equal([true]);
                expect(retries).to.deep.equal([true, true, true, true]);
                done();
            }, 50)
        })

        it("Retries forever with no limit", function(done) {
            var results = [];

            var subscription =
                observable
                    .retry()
                    .subscribe(
                        NOOP,
                        function(value) {
                            results.push(value);
                        }
                    );

            setTimeout(function() {
                subscription.dispose();
                expect(results).to.deep.equal([]);
                expect(retries.length).to.be.above(5);
                done();
            }, 49)
        })
    });

    describe("TakeUntil", function() {
        var observable,
            untilObservable,
            observableResults,
            untilObservableResults;
        beforeEach(function() {
            observableResults = [];
            untilObservableResults = [];
            observable = new Observable(function(observer) {
                var interval = setInterval(function() {
                    observer.onNext(true);
                    observableResults.push(true);
                }, 5);

                return new Disposable(function() {
                    clearInterval(interval);
                })
            });

            untilObservable = new Observable(function(observer) {
                var interval = setInterval(function() {
                    observer.onNext(true);
                    untilObservableResults.push(true);
                }, 25);

                return new Disposable(function() {
                    clearInterval(interval);
                })
            })
        })

        it("Can be disposed", function(done) {
            var results = [];

            var subscription =
                observable
                    .takeUntil(untilObservable)
                    .subscribe(
                        function(value) {
                            results.push(value);
                        },
                        NOOP
                    );

            subscription.dispose();

            setTimeout(function() {
                expect(results).to.deep.equal([]);
                expect(observableResults).to.deep.equal([]);
                expect(untilObservableResults).to.deep.equal([]);
                done();
            }, 50)
        })

        it("Completes the observable", function(done) {
            var results = []

            var subscription =
                observable
                    .takeUntil(untilObservable)
                    .subscribe(
                        function(value) {
                            results.push(value);
                        },
                        NOOP,
                        function() {
                            subscription.dispose();
                        }
                    );

            setTimeout(function() {
                expect(results).to.deep.equal([true, true, true, true]);
                expect(observableResults).to.deep.equal([true, true, true, true]);
                expect(untilObservableResults).to.deep.equal([true]);
                done();
            }, 50);
        })
    });

    describe("FlatMap", function() {
        var observable;
        beforeEach(function() {
            observable =
                Observable.prototype
                    .fromArray([6, 7, 8]);
        });

        it("Flattens a collection of observables", function(done) {
            var results = [];

            var subscription =
                observable
                    .flatMap(function(item) {
                        return Observable.prototype.fromRangeAsync(0, 2, 10);
                    })
                    .subscribe(function(item) {
                        results.push(item);
                    });

            setTimeout(function() {
                expect(results).to.deep.equal([0, 1, 2, 0, 1, 2, 0, 1, 2]);
                done();
            }, 50)
        })
    });

    describe("Delay", function() {
        var observable;
        beforeEach(function() {
            observable =
                Observable.prototype
                    .fromArray([1, 2, 3, 4, 5])
        });

        it("Delays a signal", function(done) {
            var results = [];

            var subscription =
                observable
                    .delay(10)
                    .subscribe(function(item) {
                        results.push(true);
                    })

            setTimeout(function() {
                expect(results).to.deep.equal([]);
            }, 5);

            setTimeout(function() {
                expect(results).to.deep.equal([true, true, true, true, true]);
                done();
            }, 30);
        })
    });

    describe("Concat", function() {
        var observableA,
            observableB;
        beforeEach(function() {
            observableA = Observable.prototype.fromRangeAsync(0, 3, 30);
            observableB = Observable.prototype.fromRangeAsync(6, 10, 10);
        });

        it("Subscribes in succession", function(done) {
            var results = [];

            var subscription = Observable.prototype
                .concat(observableA, observableB)
                .subscribe(function(value) {
                    results.push(value);
                })

            setTimeout(function() {
                expect(results).to.deep.equal([]);
            }, 5);

            setTimeout(function() {
                expect(results).to.deep.equal([0, 1, 2, 3, 6, 7, 8, 9, 10]);
                done();
            }, 50);
        })
    });

})