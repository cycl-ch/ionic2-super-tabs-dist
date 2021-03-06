import { Component, Renderer2, ElementRef, Input, Output, EventEmitter, ViewChild, ViewEncapsulation, NgZone } from '@angular/core';
import { Platform } from 'ionic-angular';
import { SuperTabsPanGesture } from '../super-tabs-pan-gesture';
var SuperTabsContainer = (function () {
    function SuperTabsContainer(el, rnd, plt, ngZone) {
        this.el = el;
        this.rnd = rnd;
        this.plt = plt;
        this.ngZone = ngZone;
        /**
         * Number of tabs
         * @type {number}
         */
        this.tabsCount = 0;
        /**
         * Notifies when a tab is selected
         * @type {EventEmitter<Object>}
         */
        this.tabSelect = new EventEmitter();
        /**
         * Notifies when the container is being dragged
         * @type {EventEmitter<TouchEvent>}
         */
        this.onDrag = new EventEmitter();
        // View bindings
        /**
         * Container position
         * @type {number}
         */
        this.containerPosition = 0;
        /**
         * Single tab width
         * @type {number}
         */
        this.tabWidth = 0;
        /**
         * Container width (sum of tab widths)
         * @type {number}
         */
        this.containerWidth = 0;
        /**
         * Boolean indicating whether swiping is globally enabled
         * @type {boolean}
         */
        this.globalSwipeEnabled = true;
        /**
         * Set of booleans to indicate whether swiping is enabled on each tab
         * @type {{}}
         */
        this.swipeEnabledPerTab = {};
    }
    SuperTabsContainer.prototype.ngAfterViewInit = function () {
        this.init();
    };
    SuperTabsContainer.prototype.ngOnDestroy = function () {
        this.gesture && this.gesture.destroy();
    };
    /**
     * Enable or disable swiping globally
     * @param enable {boolean} set to true to enable
     */
    SuperTabsContainer.prototype.enableTabsSwipe = function (enable) {
        this.globalSwipeEnabled = enable;
    };
    /**
     * Enable or disable swiping when a tab is selected
     * @param tabIndex {number} tab index
     * @param enable {boolean} set to true to enable
     */
    SuperTabsContainer.prototype.enableTabSwipe = function (tabIndex, enable) {
        this.swipeEnabledPerTab[tabIndex] = enable;
    };
    SuperTabsContainer.prototype.refreshDimensions = function () {
        this.calculateContainerWidth();
        this.setContainerWidth();
        this.refreshMinMax();
    };
    SuperTabsContainer.prototype.getNativeElement = function () {
        return this.el.nativeElement;
    };
    SuperTabsContainer.prototype.init = function () {
        var _this = this;
        this.refreshDimensions();
        this.gesture = new SuperTabsPanGesture(this.plt, this.container.nativeElement, this.config, this.rnd);
        this.gesture.onMove = function (delta) {
            if (_this.globalSwipeEnabled === false)
                return;
            if (_this.swipeEnabledPerTab[_this.selectedTabIndex] === false)
                return;
            if ((_this.containerPosition === _this.maxPosX && delta >= 0) || (_this.containerPosition === _this.minPosX && delta <= 0))
                return;
            _this.containerPosition += delta;
            _this.plt.raf(function () {
                _this.onDrag.emit();
                _this.moveContainer();
            });
        };
        this.gesture.onEnd = function (shortSwipe, shortSwipeDelta) {
            if (_this.globalSwipeEnabled === false)
                return;
            if (_this.swipeEnabledPerTab[_this.selectedTabIndex] === false)
                return;
            // get tab index based on container position
            var tabIndex = Math.round(_this.containerPosition / _this.tabWidth);
            // handle short swipes
            // only short swipe if we didn't change tab already in this gesture
            (tabIndex === _this.selectedTabIndex) && shortSwipe && ((shortSwipeDelta < 0 && tabIndex++) || (shortSwipeDelta > 0 && tabIndex--));
            // get location based on tab index
            var position = Math.max(_this.minPosX, Math.min(_this.maxPosX, tabIndex * _this.tabWidth));
            tabIndex = position / _this.tabWidth;
            // move container if we changed position
            if (position !== _this.containerPosition) {
                _this.plt.raf(function () {
                    _this.moveContainer(true, position, function () { return _this.ngZone.run(function () { return _this.setSelectedTab(tabIndex); }); });
                });
            }
            else
                _this.setSelectedTab(tabIndex);
        };
    };
    /**
     * Set the selected tab.
     * Emits a tabSelect event with the tab index, and a boolean indicating whether the tab changed or not.
     * @param index {number} tab index
     */
    SuperTabsContainer.prototype.setSelectedTab = function (index) {
        this.tabSelect.emit({ index: index, changed: index !== this.selectedTabIndex });
        this.selectedTabIndex = index;
    };
    /**
     * Calculate the container's width.
     * It's usually the number of tabs x tab width.
     */
    SuperTabsContainer.prototype.calculateContainerWidth = function () {
        this.containerWidth = this.tabWidth * this.tabsCount;
    };
    /**
     * Set the container's width via CSS property
     */
    SuperTabsContainer.prototype.setContainerWidth = function () {
        this.rnd.setStyle(this.container.nativeElement, 'width', this.containerWidth + 'px');
    };
    /**
     * Slide to a specific tab
     * @param index {number} tab index
     * @param [animate=true] {boolean} set to true to animate
     */
    SuperTabsContainer.prototype.slideTo = function (index, animate) {
        var _this = this;
        if (animate === void 0) { animate = true; }
        this.plt.raf(function () { return _this.moveContainer(animate, index * _this.tabWidth); });
    };
    /**
     * Moves the container to a specified position
     * @param [animate=false] {boolean} set to true to animate
     * @param [positionX] {number} position on x-axis
     * @param [callback] callback function to call after the container is moved
     */
    SuperTabsContainer.prototype.moveContainer = function (animate, positionX, callback) {
        if (animate === void 0) { animate = false; }
        if (callback === void 0) { callback = function () { }; }
        var el = this.container.nativeElement;
        if (animate) {
            if (el.style[this.plt.Css.transform].indexOf('all') === -1) {
                this.rnd.setStyle(el, this.plt.Css.transition, "all " + this.config.transitionDuration + "ms " + this.config.transitionEase);
            }
            this.rnd.setStyle(el, this.plt.Css.transform, "translate3d(" + -1 * positionX + "px, 0, 0)");
            this.containerPosition = positionX;
        }
        else {
            if (positionX) {
                this.containerPosition = positionX;
            }
            if (el.style[this.plt.Css.transform] !== 'initial') {
                this.rnd.setStyle(el, this.plt.Css.transition, 'initial');
            }
            this.containerPosition = Math.max(this.minPosX, Math.min(this.maxPosX, this.containerPosition));
            this.rnd.setStyle(el, this.plt.Css.transform, "translate3d(" + -1 * this.containerPosition + "px, 0, 0)");
        }
        callback();
    };
    /**
     * Refresh the min and max positions that the container can be at.
     * The minimum position is always 0, the maximum position is the number of tabs x tab width.
     */
    SuperTabsContainer.prototype.refreshMinMax = function () {
        this.minPosX = 0;
        this.maxPosX = (this.tabsCount - 1) * this.tabWidth;
    };
    return SuperTabsContainer;
}());
export { SuperTabsContainer };
SuperTabsContainer.decorators = [
    { type: Component, args: [{
                selector: 'super-tabs-container',
                template: '<div #container><ng-content></ng-content></div>',
                encapsulation: ViewEncapsulation.None
            },] },
];
/** @nocollapse */
SuperTabsContainer.ctorParameters = function () { return [
    { type: ElementRef, },
    { type: Renderer2, },
    { type: Platform, },
    { type: NgZone, },
]; };
SuperTabsContainer.propDecorators = {
    'config': [{ type: Input },],
    'tabsCount': [{ type: Input },],
    'selectedTabIndex': [{ type: Input },],
    'tabSelect': [{ type: Output },],
    'onDrag': [{ type: Output },],
    'container': [{ type: ViewChild, args: ['container',] },],
};
//# sourceMappingURL=super-tabs-container.js.map