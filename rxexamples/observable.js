var Observer = require("./observer");
var Disposable = require("./disposable");

module.exports = (function() {
    function isFunction(obj) { return !!(obj && obj.constructor && obj.call && obj.apply); }

    var Observable = (function () {
        function observable(handler) {
            this._handler = handler
        }

        observable.prototype = {
            subscribe: function (onNext, onError, onComplete) {
                return this._handler && this._handler(new Observer(onNext, onError, onComplete));
            },

            fromArray: function(dataArray) {
                return new Observable(function(observer) {
                    dataArray.forEach(observer.onNext);
                    observer.onComplete();
                });
            },

            fromRangeAsync: function(startValue, endValue, delay) {
                return new Observable(function(observer) {
                    var timeouts = [];
                    for (var i = startValue; i <= endValue; i++) {
                        timeouts.push(setTimeout(function(index) {
                            observer.onNext(index);
                        }.bind(this, i), delay));
                    }

                    timeouts.push(setTimeout(function() {
                        observer.onComplete();
                    }, delay + 1));

                    return new Disposable(function() {
                        timeouts.forEach(clearTimeout);
                    });
                })
            },

            map: function (transform) {
                var self = this;
                return new Observable(function (observer) {
                    var subscription = self.subscribe(
                        function (data) {
                            try {
                                observer.onNext(transform(data));
                            } catch (exception) {
                                observer.onError(exception);
                            }
                        },
                        observer.onError,
                        observer.onComplete
                    );

                    return subscription;
                });
            },

            reduce: function(action, seedValue) {
                var self = this;
                return new Observable(function(observer) {
                    var carryOver = seedValue,
                        subscription = self.subscribe(
                            function(data) {
                                try {
                                    carryOver = action(carryOver, data);
                                } catch (exception) {
                                    observer.onError(exception);
                                }
                            },
                            observer.onError,
                            function() {
                                observer.onNext(carryOver);
                                observer.onComplete();
                            }
                        );

                    return subscription;
                })
            },

            retry: function(limit) {
                var self = this;
                return new Observable(function(observer) {
                    var subscription,
                        count = 0,
                        finish = function() {
                            if (subscription) subscription.dispose();
                            observer.onComplete();
                        };

                    function resubscribe() {
                       return self.subscribe(
                           observer.onNext,
                           function (error) {
                               if (!limit || count++ < limit) {
                                   if (subscription) subscription.dispose();
                                   subscription = resubscribe();
                               } else {
                                   observer.onError(error);
                                   finish();
                               }
                           },
                           finish
                        );
                    }

                    subscription = resubscribe();
                    return new Disposable(function() {
                        finish();
                        limit = 1;
                    });
                })
            },

            takeUntil: function(untilObservable) {
                var self = this;
                return new Observable(function(observer) {
                    var finish = function() {
                       if (untilSubscription) untilSubscription.dispose();
                       if (subscription) subscription.dispose();
                       observer.onComplete();
                    }

                    var subscription = self.subscribe(
                        observer.onNext,
                        observer.onError,
                        finish
                    );

                    var untilSubscription = untilObservable.subscribe(finish);

                    return new Disposable(function() {
                        if (untilSubscription) untilSubscription.dispose();
                        if (subscription) subscription.dispose();
                    });
                });
            },

            flatMap: function(transform) {
                var self = this;
                return new Observable(function(observer) {
                    var innerCount = 0,
                        streamComplete = false,
                        subscription;

                    function checkIfComplete() {
                        if (innerCount === 0 && streamComplete) {
                            if (subscription) subscription.dispose();
                            observer.onComplete();
                        }
                    }

                    subscription = self.subscribe(
                        function(data) {
                            innerCount++;

                            try {
                                var innerSubscription =
                                        transform(data).subscribe(
                                            observer.onNext,
                                            observer.onError,
                                            function() {
                                                innerCount--;
                                                if (innerSubscription) innerSubscription.dispose();
                                            }
                                        );
                            } catch (exception) {
                                observer.onError(exception);
                            }
                        },
                        observer.onError,
                        function() {
                            if (!streamComplete) {
                                streamComplete = true;
                                checkIfComplete();
                            }
                        }
                    );

                    return subscription;
                });
            },

            delay: function(timer) {
                var self = this;
                return new Observable(function(observer) {
                    var streamComplete = false,
                        subscription,
                        id;

                    function finish() {
                        if (streamComplete && !id) {
                            if (subscription) subscription.dispose();
                            observer.onComplete();
                        }
                    }

                    subscription = self.subscribe(
                        function(data) {
                            id = setTimeout(function() {
                                id = null;
                                observer.onNext(data);
                                finish();
                            }, timer);
                        },
                        observer.onError,
                        function() {
                            if (!streamComplete) {
                                streamComplete = true;
                                finish();
                            }
                        }
                    );

                    return subscription;
                });
            },

            delayWithSelector: function(computeTimer) {
                var self = this;
                return new Observable(function(observer) {
                    var streamComplete = false,
                        subscription,
                        id;

                    function finish() {
                        if (streamComplete && !id) {
                            if (subscription) subscription.dispose();
                            observer.onComplete();
                        }
                    }

                    subscription = self.subscribe(
                        function(data) {
                            try {
                                id = setTimeout(function() {
                                    id = null;
                                    observer.onNext(data);
                                    finish();
                                }, computeTimer(data));
                            } catch (exception) {
                                observer.onError(exception);
                            }
                        },
                        observer.onError,
                        function() {
                            if (!streamComplete) {
                                streamComplete = true;
                                finish();
                            }
                        }
                    );

                    return subscription;
                });
            },

            concat: function() {
                var observables = Array.prototype.slice.call(arguments);

                return new Observable(function(observer) {
                    var observable,
                        subscription;

                    function subscribe() {
                        if (observables.length) {
                            observable = observables.shift();
                            subscription = observable.subscribe(
                                observer.onNext,
                                observer.onError,
                                function() {
                                    if (subscription) subscription.dispose();
                                    subscribe();
                                }
                            )
                        } else {
                            observer.onComplete();
                        }
                    }

                    subscribe();
                    return subscription;
                });

            }
        }

        return observable;
    })();

    return Observable;
})();