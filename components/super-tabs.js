import { Component, ElementRef, Input, Renderer2, ViewChild, Output, EventEmitter, ViewEncapsulation, forwardRef, Optional } from '@angular/core';
import { NavController, RootNode, ViewController, App, DeepLinker, DomController, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { SuperTabsToolbar } from './super-tabs-toolbar';
import { SuperTabsContainer } from './super-tabs-container';
import { SuperTabsController } from '../providers/super-tabs-controller';
import { DIRECTION_SWITCH } from 'ionic-angular/navigation/nav-util';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/debounceTime';
var SuperTabs = (function () {
    function SuperTabs(parent, viewCtrl, _app, el, rnd, superTabsCtrl, linker, domCtrl, _plt) {
        var _this = this;
        this.viewCtrl = viewCtrl;
        this._app = _app;
        this.el = el;
        this.rnd = rnd;
        this.superTabsCtrl = superTabsCtrl;
        this.linker = linker;
        this.domCtrl = domCtrl;
        this._plt = _plt;
        /**
         * Color of the slider that moves based on what tab is selected
         */
        this.indicatorColor = 'primary';
        /**
         * Badge color
         */
        this.badgeColor = 'primary';
        /**
         * Configuration
         */
        this.config = {};
        /**
         * Tab buttons placement. Can be `top` or `bottom`.
         * @type {string}
         */
        this.tabsPlacement = 'top';
        /**
         * Emits the tab index when the selected tab changes
         * @type {EventEmitter<Object>}
         */
        this.tabSelect = new EventEmitter();
        /**
         * Emits event when tab dragging is activated
         */
        this.tabDragStart = new EventEmitter();
        /**
         * Emits event when tab dragging is stopped (when a user lets go)
         */
        this.tabDragEnd = new EventEmitter();
        /**
         * Indicates whether the toolbar is visible
         * @private
         */
        this._isToolbarVisible = true;
        /**
         * @private
         */
        this._tabs = [];
        /**
         * The duration (ms) after the last onDrag event where the
         * dragging state is considered 'stopped'
         */
        this.tabDragStoppedTimeout = 200;
        /**
         * Indicates whether the tab buttons should scroll
         * @type {boolean}
         * @private
         */
        this._scrollTabs = false;
        /**
         * We use a timeout to identify whether dragging has completed
         * @type {number}
         * @private
         */
        this._isDraggingTimeoutId = null;
        /**
         * Selected tab index
         * @type {number}
         * @private
         */
        this._selectedTabIndex = 0;
        /**
         * Any observable subscriptions that we should unsubscribe from when destroying this component
         * @type {Array<Subscription>}
         * @private
         */
        this.watches = [];
        /**
         * Indicates whether any of the tabs has an icon
         * @type {boolean}
         * @private
         */
        this.hasIcons = false;
        /**
         * Indicates whether any of the tabs has a title
         * @type {boolean}
         * @private
         */
        this.hasTitles = false;
        /**
         * Indicates whether the component has finished initializing
         * @type {boolean}
         * @private
         */
        this.init = false;
        this.parent = parent;
        if (this.parent) {
            this.parent.registerChildNav(this);
        }
        else if (viewCtrl && viewCtrl.getNav()) {
            this.parent = viewCtrl.getNav();
            this.parent.registerChildNav(this);
        }
        else if (this._app) {
            this._app.registerRootNav(this);
        }
        var obsToMerge = [
            Observable.fromEvent(window, 'orientationchange'),
            Observable.fromEvent(window, 'resize')
        ];
        if (viewCtrl) {
            obsToMerge.push(viewCtrl.didEnter);
            viewCtrl._setContent(this);
            viewCtrl._setContentRef(el);
        }
        // re-adjust the height of the slider when the orientation changes
        var $windowResize = Observable.merge.apply(this, obsToMerge).debounceTime(10);
        var windowResizeSub = $windowResize.subscribe(function () {
            _this.setMaxIndicatorPosition();
            _this.updateTabWidth();
            _this.setFixedIndicatorWidth();
            _this.refreshTabWidths();
            _this.tabsContainer.refreshDimensions();
            _this.tabsContainer.slideTo(_this.selectedTabIndex);
            _this.alignIndicatorPosition();
            _this.refreshContainerHeight();
        });
        this.watches.push(windowResizeSub);
    }
    SuperTabs.prototype.getType = function () { return; };
    SuperTabs.prototype.getSecondaryIdentifier = function () { return; };
    SuperTabs.prototype.getAllChildNavs = function () {
        return this._tabs;
    };
    Object.defineProperty(SuperTabs.prototype, "height", {
        get: function () {
            return this.el.nativeElement.offsetHeight;
        },
        /**
         * Height of the tabs
         */
        set: function (val) {
            this.rnd.setStyle(this.el.nativeElement, 'height', val + 'px');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SuperTabs.prototype, "selectedTabIndex", {
        get: function () {
            return this._selectedTabIndex;
        },
        /**
         * The initial selected tab index
         * @param val {number} tab index
         */
        set: function (val) {
            this._selectedTabIndex = Number(val);
            this.init && this.alignIndicatorPosition(true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SuperTabs.prototype, "scrollTabs", {
        get: function () {
            return this._scrollTabs;
        },
        /**
         * Set to true to enable tab buttons scrolling
         * @param val
         */
        set: function (val) {
            this._scrollTabs = typeof val !== 'boolean' || val === true;
        },
        enumerable: true,
        configurable: true
    });
    SuperTabs.prototype.ngOnInit = function () {
        var defaultConfig = {
            dragThreshold: 10,
            maxDragAngle: 40,
            sideMenuThreshold: 50,
            transitionDuration: 300,
            transitionEase: 'cubic-bezier(0.35, 0, 0.25, 1)',
            shortSwipeDuration: 300
        };
        for (var prop in this.config) {
            defaultConfig[prop] = this.config[prop];
        }
        this.config = defaultConfig;
        this.id = this.id || "super-tabs-" + ++superTabsIds;
        this.superTabsCtrl.registerInstance(this);
        if (this.tabsPlacement === 'bottom') {
            this.rnd.addClass(this.getElementRef().nativeElement, 'tabs-placement-bottom');
        }
    };
    SuperTabs.prototype.ngAfterContentInit = function () {
        this.updateTabWidth();
        this.toolbar.tabs = this._tabs;
    };
    SuperTabs.prototype.ngAfterViewInit = function () {
        var _this = this;
        var tabsSegment = this.linker.getSegmentByNavIdOrName(this.id, this.name);
        if (tabsSegment) {
            this.selectedTabIndex = this.getTabIndexById(tabsSegment.id);
        }
        this.linker.navChange(DIRECTION_SWITCH);
        if (!this.hasTitles && !this.hasIcons)
            this._isToolbarVisible = false;
        this.tabsContainer.slideTo(this.selectedTabIndex, false);
        this.refreshTabStates();
        this.setFixedIndicatorWidth();
        // we need this to make sure the "slide" thingy doesn't move outside the screen
        this.setMaxIndicatorPosition();
        setTimeout(function () { return _this.alignIndicatorPosition(); }, 100);
        this.refreshContainerHeight();
        this.init = true;
    };
    SuperTabs.prototype.ngOnDestroy = function () {
        this.watches.forEach(function (watch) {
            watch.unsubscribe && watch.unsubscribe();
        });
        this.parent.unregisterChildNav(this);
        this.superTabsCtrl.unregisterInstance(this.id);
    };
    /**
     * Sets the badge number for a specific tab
     * @param tabId {string} tab ID
     * @param value {number} badge number
     */
    SuperTabs.prototype.setBadge = function (tabId, value) {
        this.getTabById(tabId).setBadge(value);
    };
    /**
     * Clears the badge for a specific tab
     * @param tabId {string} tab ID
     */
    SuperTabs.prototype.clearBadge = function (tabId) {
        this.getTabById(tabId).clearBadge();
    };
    /**
     * Increases the badge value for a specific tab
     * @param tabId {string} tab ID
     * @param increaseBy {number} the number to increase by
     */
    SuperTabs.prototype.increaseBadge = function (tabId, increaseBy) {
        this.getTabById(tabId).increaseBadge(increaseBy);
    };
    SuperTabs.prototype.decreaseBadge = function (tabId, decreaseBy) {
        this.getTabById(tabId).decreaseBadge(decreaseBy);
    };
    SuperTabs.prototype.enableTabsSwipe = function (enable) {
        this.tabsContainer.enableTabsSwipe(enable);
    };
    SuperTabs.prototype.enableTabSwipe = function (tabId, enable) {
        this.tabsContainer.enableTabSwipe(this.getTabIndexById(tabId), enable);
    };
    SuperTabs.prototype.showToolbar = function (show) {
        this._isToolbarVisible = show;
        this.refreshContainerHeight();
    };
    SuperTabs.prototype.slideTo = function (indexOrId) {
        if (typeof indexOrId === 'string') {
            indexOrId = this.getTabIndexById(indexOrId);
        }
        this.onToolbarTabSelect(indexOrId);
    };
    SuperTabs.prototype.getActiveChildNavs = function () {
        return [this._tabs[this.selectedTabIndex]];
    };
    SuperTabs.prototype.addTab = function (tab) {
        tab.rootParams = tab.rootParams || {};
        tab.rootParams.rootNavCtrl = this.parent;
        tab.tabId = tab.tabId || "super-tabs-" + this.id + "-tab-" + this._tabs.length;
        this._tabs.push(tab);
        if (tab.icon) {
            this.hasIcons = true;
        }
        if (tab.title) {
            this.hasTitles = true;
        }
        tab.setWidth(this.el.nativeElement.offsetWidth);
    };
    /**
     * We listen to drag events to move the "slide" thingy along with the slides
     */
    SuperTabs.prototype.onDrag = function () {
        var _this = this;
        // handle the events for start/stop dragging
        this.tabDragStarted();
        if (!this._isToolbarVisible)
            return;
        this.domCtrl.write(function () {
            var singleSlideWidth = _this.tabsContainer.tabWidth, slidesWidth = _this.tabsContainer.containerWidth;
            var percentage = Math.abs(_this.tabsContainer.containerPosition / slidesWidth);
            if (_this.scrollTabs) {
                var originalSlideStart = singleSlideWidth * _this.selectedTabIndex, originalPosition = _this.getRelativeIndicatorPosition(), originalWidth = _this.getSegmentButtonWidth();
                var nextPosition = void 0, nextWidth = void 0, indicatorPosition = void 0, indicatorWidth = void 0;
                var deltaTabPos = originalSlideStart - Math.abs(_this.tabsContainer.containerPosition);
                percentage = Math.abs(deltaTabPos / singleSlideWidth);
                if (deltaTabPos < 0) {
                    // going to next slide
                    nextPosition = _this.getRelativeIndicatorPosition(_this.selectedTabIndex + 1);
                    nextWidth = _this.getSegmentButtonWidth(_this.selectedTabIndex + 1);
                    indicatorPosition = originalPosition + percentage * (nextPosition - originalPosition);
                }
                else {
                    // going to previous slide
                    nextPosition = _this.getRelativeIndicatorPosition(_this.selectedTabIndex - 1);
                    nextWidth = _this.getSegmentButtonWidth(_this.selectedTabIndex - 1);
                    indicatorPosition = originalPosition - percentage * (originalPosition - nextPosition);
                }
                var deltaWidth = nextWidth - originalWidth;
                indicatorWidth = originalWidth + percentage * deltaWidth;
                if ((originalWidth > nextWidth && indicatorWidth < nextWidth) || (originalWidth < nextWidth && indicatorWidth > nextWidth)) {
                    // this is only useful on desktop, because you are able to drag and swipe through multiple tabs at once
                    // which results in the indicator width to be super small/big since it's changing based on the current/next widths
                    indicatorWidth = nextWidth;
                }
                _this.alignTabButtonsContainer();
                _this.toolbar.setIndicatorProperties(indicatorWidth, indicatorPosition);
            }
            else {
                _this.toolbar.setIndicatorPosition(Math.min(percentage * singleSlideWidth, _this.maxIndicatorPosition));
            }
        });
    };
    /**
     * Runs when the user clicks on a segment button
     * @param index
     */
    SuperTabs.prototype.onTabChange = function (index) {
        this.tabDragStopped();
        if (index === this.selectedTabIndex) {
            this.tabSelect.emit({
                index: index,
                id: this._tabs[index].tabId,
                changed: false
            });
        }
        if (index <= this._tabs.length) {
            var currentTab = this.getActiveTab();
            var activeView = currentTab.getActive();
            if (activeView) {
                activeView._willLeave(false);
                activeView._didLeave();
            }
            this.selectedTabIndex = index;
            this.linker.navChange(DIRECTION_SWITCH);
            this.refreshTabStates();
            activeView = this.getActiveTab().getActive();
            if (activeView) {
                activeView._willEnter();
                activeView._didEnter();
            }
            this.tabSelect.emit({
                index: index,
                id: this._tabs[index].tabId,
                changed: true
            });
        }
    };
    SuperTabs.prototype.onToolbarTabSelect = function (index) {
        this.tabsContainer.slideTo(index);
        this.onTabChange(index);
    };
    SuperTabs.prototype.onContainerTabSelect = function (ev) {
        if (ev.changed) {
            this.onTabChange(ev.index);
        }
        this.alignIndicatorPosition(true);
    };
    SuperTabs.prototype.refreshTabStates = function () {
        var _this = this;
        this._tabs.forEach(function (tab, i) {
            tab.setActive(i === _this.selectedTabIndex);
            tab.load(Math.abs(_this.selectedTabIndex - i) < 2);
        });
    };
    SuperTabs.prototype.updateTabWidth = function () {
        this.tabsContainer.tabWidth = this.el.nativeElement.offsetWidth;
    };
    SuperTabs.prototype.refreshContainerHeight = function () {
        var heightOffset = 0;
        if (this._isToolbarVisible) {
            if (this.hasTitles && this.hasIcons) {
                heightOffset = 72;
            }
            else if (this.hasTitles || this.hasIcons) {
                heightOffset = 48;
            }
        }
        this.rnd.setStyle(this.tabsContainer.getNativeElement(), 'height', "calc(100% - " + heightOffset + "px)");
    };
    SuperTabs.prototype.refreshTabWidths = function () {
        var width = this.el.nativeElement.offsetWidth;
        this._tabs.forEach(function (tab) { return tab.setWidth(width); });
    };
    SuperTabs.prototype.alignTabButtonsContainer = function (animate) {
        var mw = this.el.nativeElement.offsetWidth, // max width
        iw = this.toolbar.indicatorWidth, // indicator width
        ip = this.toolbar.indicatorPosition, // indicatorPosition
        sp = this.toolbar.segmentPosition; // segment position
        if (mw === 0)
            return;
        if (this.toolbar.segmentWidth <= mw) {
            if (this.toolbar.segmentPosition !== 0) {
                this.toolbar.setSegmentPosition(0, animate);
            }
            return;
        }
        var pos;
        if (ip + iw + (mw / 2 - iw / 2) > mw + sp) {
            // we need to move the segment container to the left
            var delta = (ip + iw + (mw / 2 - iw / 2)) - mw - sp, max = this.toolbar.segmentWidth - mw;
            pos = sp + delta;
            pos = pos < max ? pos : max;
        }
        else if (ip - (mw / 2 - iw / 2) < sp) {
            // we need to move the segment container to the right
            pos = ip - (mw / 2 - iw / 2);
            // pos = pos >= 0? pos : 0;
            pos = pos < 0 ? 0 : pos > ip ? (ip - mw + iw) : pos;
            // pos = pos < 0? 0 : pos > maxPos? maxPos : pos;
        }
        else
            return; // no need to move the segment container
        this.toolbar.setSegmentPosition(pos, animate);
    };
    SuperTabs.prototype.getRelativeIndicatorPosition = function (index) {
        if (index === void 0) { index = this.selectedTabIndex; }
        var position = 0;
        for (var i = 0; i < this.toolbar.segmentButtonWidths.length; i++) {
            if (index > Number(i)) {
                position += this.toolbar.segmentButtonWidths[i];
            }
        }
        return position;
    };
    SuperTabs.prototype.getAbsoluteIndicatorPosition = function () {
        var position = this.selectedTabIndex * this.tabsContainer.tabWidth / this._tabs.length;
        return position <= this.maxIndicatorPosition ? position : this.maxIndicatorPosition;
    };
    /**
     * Gets the width of a tab button when `scrollTabs` is set to `true`
     */
    SuperTabs.prototype.getSegmentButtonWidth = function (index) {
        if (index === void 0) { index = this.selectedTabIndex; }
        if (!this._isToolbarVisible)
            return;
        return this.toolbar.segmentButtonWidths[index];
    };
    SuperTabs.prototype.setMaxIndicatorPosition = function () {
        if (this.el && this.el.nativeElement) {
            this.maxIndicatorPosition = this.el.nativeElement.offsetWidth - (this.el.nativeElement.offsetWidth / this._tabs.length);
        }
    };
    SuperTabs.prototype.setFixedIndicatorWidth = function () {
        if (this.scrollTabs || !this._isToolbarVisible)
            return;
        // the width of the "slide", should be equal to the width of a single `ion-segment-button`
        // we'll just calculate it instead of querying for a segment button
        this.toolbar.setIndicatorWidth(this.el.nativeElement.offsetWidth / this._tabs.length, false);
    };
    /**
     * Aligns slide position with selected tab
     */
    SuperTabs.prototype.alignIndicatorPosition = function (animate) {
        if (animate === void 0) { animate = false; }
        if (!this._isToolbarVisible)
            return;
        if (this.scrollTabs) {
            this.toolbar.alignIndicator(this.getRelativeIndicatorPosition(), this.getSegmentButtonWidth(), animate);
            this.alignTabButtonsContainer(animate);
        }
        else {
            this.toolbar.setIndicatorPosition(this.getAbsoluteIndicatorPosition(), animate);
        }
    };
    SuperTabs.prototype.tabDragStarted = function () {
        var _this = this;
        if (this._isDraggingTimeoutId == null) {
            this.tabDragStart.emit();
        }
        else {
            clearTimeout(this._isDraggingTimeoutId);
        }
        this._isDraggingTimeoutId = setTimeout(function () {
            _this.tabDragStopped();
        }, this.tabDragStoppedTimeout);
    };
    SuperTabs.prototype.tabDragStopped = function () {
        // we have no mechanism to identify when the user stops dragging
        // so we need to use a timeout which is reset on every drag motion
        this._isDraggingTimeoutId && clearTimeout(this._isDraggingTimeoutId);
        this._isDraggingTimeoutId = null;
        this.tabDragEnd.emit();
    };
    SuperTabs.prototype.getTabIndexById = function (tabId) {
        return this._tabs.findIndex(function (tab) { return tab.tabId === tabId; });
    };
    SuperTabs.prototype.getTabById = function (tabId) {
        return this._tabs.find(function (tab) { return tab.tabId === tabId; });
    };
    SuperTabs.prototype.getActiveTab = function () {
        return this._tabs[this.selectedTabIndex];
    };
    // needed since we're implementing RootNode
    SuperTabs.prototype.getElementRef = function () { return this.el; };
    // needed since we're implementing RootNode
    SuperTabs.prototype.initPane = function () { return true; };
    // needed since we're implementing RootNode
    SuperTabs.prototype.paneChanged = function () { };
    // needed to make Ionic Framework think this is a tabs component... needed for Deeplinking
    SuperTabs.prototype.getSelected = function () { };
    // needed to make Ionic Framework think this is a tabs component... needed for Deeplinking
    SuperTabs.prototype.setTabbarPosition = function () { };
    // update segment button widths manually
    SuperTabs.prototype.indexSegmentButtonWidths = function () {
        var _this = this;
        this._plt.raf(function () { return _this.toolbar.indexSegmentButtonWidths(); });
    };
    return SuperTabs;
}());
export { SuperTabs };
SuperTabs.decorators = [
    { type: Component, args: [{
                selector: 'super-tabs',
                template: "\n    <super-tabs-toolbar [tabsPlacement]=\"tabsPlacement\" [hidden]=\"!_isToolbarVisible\" [config]=\"config\"\n                        [color]=\"toolbarBackground\"\n                        [tabsColor]=\"toolbarColor\" [indicatorColor]=\"indicatorColor\" [badgeColor]=\"badgeColor\"\n                        [scrollTabs]=\"scrollTabs\"\n                        [selectedTab]=\"selectedTabIndex\"\n                        (tabSelect)=\"onToolbarTabSelect($event)\"></super-tabs-toolbar>\n    <super-tabs-container [config]=\"config\" [tabsCount]=\"_tabs.length\" [selectedTabIndex]=\"selectedTabIndex\"\n                          (tabSelect)=\"onContainerTabSelect($event)\" (onDrag)=\"onDrag($event)\">\n      <ng-content></ng-content>\n    </super-tabs-container>\n  ",
                encapsulation: ViewEncapsulation.None,
                providers: [
                    {
                        provide: RootNode,
                        useExisting: forwardRef(function () { return SuperTabs; })
                    }
                ]
            },] },
];
/** @nocollapse */
SuperTabs.ctorParameters = function () { return [
    { type: NavController, decorators: [{ type: Optional },] },
    { type: ViewController, decorators: [{ type: Optional },] },
    { type: App, },
    { type: ElementRef, },
    { type: Renderer2, },
    { type: SuperTabsController, },
    { type: DeepLinker, },
    { type: DomController, },
    { type: Platform, },
]; };
SuperTabs.propDecorators = {
    'toolbarBackground': [{ type: Input },],
    'toolbarColor': [{ type: Input },],
    'indicatorColor': [{ type: Input },],
    'badgeColor': [{ type: Input },],
    'config': [{ type: Input },],
    'id': [{ type: Input },],
    'name': [{ type: Input },],
    'height': [{ type: Input },],
    'selectedTabIndex': [{ type: Input },],
    'scrollTabs': [{ type: Input },],
    'tabsPlacement': [{ type: Input },],
    'tabSelect': [{ type: Output },],
    'tabDragStart': [{ type: Output },],
    'tabDragEnd': [{ type: Output },],
    'toolbar': [{ type: ViewChild, args: [SuperTabsToolbar,] },],
    'tabsContainer': [{ type: ViewChild, args: [SuperTabsContainer,] },],
};
var superTabsIds = -1;
//# sourceMappingURL=super-tabs.js.map