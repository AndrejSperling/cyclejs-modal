import { VNode } from "@cycle/dom";
export declare type Sinks = any;
export declare type Sources = any;
export declare type Component = (s: Sources) => Sinks;
export declare type WrappedComponent = (s: Sources, c: Component, p: Props) => Sinks;
export interface Props {
}
export interface Open {
    type: 'open';
    props: Props;
    component: Component;
}
export interface Close {
    type: 'close';
    count?: number;
}
export interface Message {
    type: 'message';
    payload: any;
}
export declare type ModalAction = Open | Close | Message;
export declare function wrappedModalify(main: Component, wrapper: WrappedComponent): Component;
export declare function modalify(main: Component, name?: string, center?: boolean, modalContainerClass?: string, background?: string, zIndex?: number, wrapper?: WrappedComponent): Component;
export declare function centerHTML(child: VNode): VNode;
