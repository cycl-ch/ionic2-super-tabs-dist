import { Renderer, ElementRef, ComponentFactoryResolver, NgZone, ViewContainerRef, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ErrorHandler } from '@angular/core';
import { NavControllerBase, App, Config, Platform, GestureController, DeepLinker, DomController, NavOptions } from 'ionic-angular';
import { TransitionController } from 'ionic-angular/transitions/transition-controller';
import { SuperTabs } from './super-tabs';
export declare class SuperTab extends NavControllerBase implements OnInit, AfterViewInit, OnDestroy {
    private linker;
    private _dom;
    private cd;
    /**
     * Title of the tab
     */
    title: string;
    readonly tabTitle: string;
    readonly index: any;
    /**
     * Name of the ionicon to use
     */
    icon: string;
    /**
     * @input {Page} Set the root page for this tab.
     */
    root: any;
    /**
     * @input {object} Any nav-params to pass to the root page of this tab.
     */
    rootParams: any;
    tabId: string;
    readonly _tabId: string;
    /**
     * Badge value
     * @type {Number}
     */
    badge: number;
    /**
     * Enable/disable swipe to go back for iOS
     * @return {boolean}
     */
    swipeBackEnabled: boolean;
    /**
     * @hidden
     */
    _vp: ViewContainerRef;
    /**
     * Indicates whether the tab has been loaded
     * @type {boolean}
     */
    private loaded;
    /**
     * A promise that resolves when the component has initialized
     */
    private init;
    /**
     * Function to call to resolve the init promise
     */
    private initResolve;
    constructor(parent: SuperTabs, app: App, config: Config, plt: Platform, el: ElementRef, zone: NgZone, rnd: Renderer, cfr: ComponentFactoryResolver, gestureCtrl: GestureController, transCtrl: TransitionController, errorHandler: ErrorHandler, linker: DeepLinker, _dom: DomController, cd: ChangeDetectorRef);
    ngOnInit(): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    setActive(active: boolean): void;
    load(load: boolean): void;
    setBadge(value: number): void;
    clearBadge(): void;
    increaseBadge(increaseBy?: number): void;
    decreaseBadge(decreaseBy?: number): void;
    setWidth(width: number): void;
    goToRoot(opts: NavOptions): Promise<any>;
}
