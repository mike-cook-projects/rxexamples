 module.exports = (function Observer() {
    //// Constructor
    // onNext: The handler for the next item of data
    // onError: The handler for the next item of error data
    // onComplete: The handler for when the series of data is complete
    function observer(onNext, onError, onComplete) {
        this.onNext = onNext;
        if (onError) this.onError = onError;
        if (onComplete) this.onComplete = onComplete;
    }

    // Eat error and complete by default
    observer.prototype = {
        onError: function () {},
        onComplete: function () {}
    }

    return observer;
 })();