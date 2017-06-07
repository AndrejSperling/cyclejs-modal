import xs, { Stream } from "xstream";
import { DOMSource, h, VNode } from "@cycle/dom";
import isolate from "@cycle/isolate";
import { adapt } from "@cycle/run/lib/adapt";
import { extractSinks, mergeSinks } from "cyclejs-utils";

export type Sinks = any;
export type Sources = any;
export type Component = (s: Sources) => Sinks;
export type WrappedComponent = (s: Sources, c:Component, p:Props) => Sinks;

export interface Props {}

export interface Open {
    type: 'open';
    props: Props;
    component: Component;
}

export interface Close {
    type: 'close';
    count?: number; //Default is one
}
export interface Message {
    type: 'message';
    payload: any;
}

export type ModalAction = Open | Close | Message;

export function wrappedModalify(main: Component, wrapper: WrappedComponent) {
    return modalify(main, 'modal', true, 'cyclejs-modal-container', 'rgb(0,0,0,0.8)', 500, wrapper)
}

export function modalify(main: Component,
                         name = 'modal',
                         center = true,
                         modalContainerClass: string = null,
                         background: string = 'rgba(0,0,0,0.8)',
                         zIndex = 500,
                         wrapper: WrappedComponent = null): Component {
    return function (sources: Sources): Sinks {

        const messageProxy$: Stream<Message> = xs.create<Message>();

        const sinks: Sinks = main({
            ...sources, [name]: adapt(messageProxy$)
        });

        const closeClick$: Stream<ModalAction> = (sources.DOM as DOMSource).select('.cyclejs-modal-dimmer')
            .events('click')
            .mapTo({type: "close"} as Close);

        if (sinks[name]) {

            const modalProxy$: Stream<ModalAction> = xs.create<ModalAction>();
            const modalStack$: Stream<Sinks[]> = xs.merge(
                xs.fromObservable<ModalAction>(sinks[name]),
                modalProxy$,
                closeClick$
            )
                .fold((acc, curr) => {
                    if (curr.type === 'close') {
                        const count: number = curr.count || 1;
                        return acc.slice(0, Math.max(acc.length - count, 0));
                    }
                    else if (curr.type === 'open') {
                        return [...acc,
                            (wrapper == null ) ?
                                isolate(curr.component)(sources) :
                                isolate(wrapper)(sources, curr.component, curr.props)
                        ];
                    }
                    return acc;
                }, []);

            const modalVDom$: Stream<VNode[]> = modalStack$
                .map<Stream<VNode>[]>(arr => arr.map(s => s.DOM))
                .map<Stream<VNode[]>>(arr => xs.combine(...arr))
                .flatten();

            const mergedVDom$: Stream<VNode> = xs.combine(
                xs.fromObservable<VNode>(sinks.DOM),
                modalVDom$
            )
                .map<VNode>(([vdom, modals]) => h('div', {}, [
                    vdom,
                    center && modals.length > 0 ?
                        displayModals(
                            wrapModals(modals, modalContainerClass),
                            background,
                            zIndex
                        )
                        : h('div', {}, modals)
                ]));

            const extractedSinks: Sinks = extractSinks(
                modalStack$.map<Sinks>(arr => mergeSinks(...arr)),
                Object.keys(sinks)
            );

            modalProxy$.imitate(extractedSinks.modal);
            messageProxy$.imitate(extractedSinks.modal.filter(a => a.type === 'message'));

            const newSinks = {
                ...mergeSinks(extractedSinks, sinks),
                DOM: mergedVDom$
            };

            return Object.keys(newSinks)
                .map(k => ({[k]: adapt(newSinks[k])}))
                .reduce(Object.assign, {});
        }
        return sinks;
    }
}

export function centerHTML(child: VNode): VNode {
    return h('div', {
        style: {
            width: '100%',
            height: '100%',
            position: 'relative',
            delayed: undefined,
            remove: undefined
        }
    }, [
        h('div', {
            style: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                '-ms-transform': 'translate(-50%, -50%)',
                '-webkit-transform': 'translate(-50%, -50%)',
                transform: 'translate(-50%, -50%)',
                delayed: undefined,
                remove: undefined
            }
        }, [child])
    ]);
}

function displayModals(modals: VNode[], background: string = 'rgba(0,0,0,0.8)', zIndex = 500): VNode {
    const processedModals: VNode[] = modals
        .map((m, i) => addStyles({
            'z-index': i * 5 + 10
        }, m));

    return addStyles({
        background,
        'z-index': zIndex,
        overflow: 'hidden',
        top: document.body.scrollTop + 'px',
        left: document.body.scrollLeft + 'px',
        position: 'absolute',
        width: '100%',
        height: '100%'
    }, h('div.cyclejs-modal-dimmer', {}, [centerHTML(h('div', {
        hook: {
            insert: (vnode) => {
                vnode.elm.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                })
            }
        }
    }, processedModals))]));
}

function wrapModals(modals: VNode[], containerClass: string | null = null): VNode[] {
    const wrapper = child => h('div', containerClass ? {
        attrs: {
            class: containerClass
        }
    } : {
        style: {
            display: 'block',
            padding: '10px',
            background: 'white',
            width: 'auto',
            height: 'auto',
            'border-radius': '5px',
            delayed: undefined,
            remove: undefined
        }
    }, [
        child
    ]);

    return modals.map(wrapper);
}


function addStyles(styles: { [k: string]: any }, vnode: VNode): VNode {
    return {
        ...vnode,
        data: {
            ...(vnode.data || {}),
            style: {
                ...(vnode.data.style || {}),
                ...styles
            }
        }
    } as VNode;
}
