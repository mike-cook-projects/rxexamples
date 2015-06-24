module.exports = (function() {
    function disposable(dispose) {
        this._dispose = dispose;
        this.isDisposed = false;
    };

    disposable.prototype = {
        dispose: function() {
            if (!this.isDisposed && this._dispose) {
                this._dispose();
                this.isDisposed = true;
            }
        }
    }

    return disposable;
})();