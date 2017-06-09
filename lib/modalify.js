"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xstream_1 = require("xstream");
const dom_1 = require("@cycle/dom");
const isolate_1 = require("@cycle/isolate");
const adapt_1 = require("@cycle/run/lib/adapt");
const cyclejs_utils_1 = require("cyclejs-utils");
function wrappedModalify(main, wrapper) {
    return modalify(main, 'modal', true, 'cyclejs-modal-container', 'rgb(0,0,0,0.8)', 500, wrapper);
}
exports.wrappedModalify = wrappedModalify;
function modalify(main, name = 'modal', center = true, modalContainerClass = null, background = 'rgba(0,0,0,0.8)', zIndex = 500, wrapper = null) {
    return function (sources) {
        const messageProxy$ = xstream_1.default.create();
        const sinks = main(Object.assign({}, sources, { [name]: adapt_1.adapt(messageProxy$) }));
        const closeClick$ = sources.DOM.select('.cyclejs-modal-dimmer')
            .events('click')
            .mapTo({ type: "close" });
        if (sinks[name]) {
            const modalProxy$ = xstream_1.default.create();
            const modalStack$ = xstream_1.default.merge(xstream_1.default.fromObservable(sinks[name]), modalProxy$, closeClick$)
                .fold((acc, curr) => {
                if (curr.type === 'close') {
                    const count = curr.count || 1;
                    return acc.slice(0, Math.max(acc.length - count, 0));
                }
                else if (curr.type === 'open') {
                    return [...acc,
                        (wrapper == null) ?
                            isolate_1.default(curr.component)(sources) :
                            isolate_1.default(wrapper)(sources, curr.component, curr.props)
                    ];
                }
                return acc;
            }, []);
            const modalVDom$ = modalStack$
                .map(arr => arr.map(s => s.DOM))
                .map(arr => xstream_1.default.combine(...arr))
                .flatten();
            const mergedVDom$ = xstream_1.default.combine(xstream_1.default.fromObservable(sinks.DOM), modalVDom$)
                .map(([vdom, modals]) => dom_1.h('div', {}, [
                vdom,
                center && modals.length > 0 ?
                    displayModals(wrapModals(modals, modalContainerClass), background, zIndex)
                    : dom_1.h('div', {}, modals)
            ]));
            const extractedSinks = cyclejs_utils_1.extractSinks(modalStack$.map(arr => cyclejs_utils_1.mergeSinks(...arr)), Object.keys(sinks));
            modalProxy$.imitate(extractedSinks.modal);
            messageProxy$.imitate(extractedSinks.modal.filter(a => a.type === 'message'));
            const newSinks = Object.assign({}, cyclejs_utils_1.mergeSinks(extractedSinks, sinks), { DOM: mergedVDom$ });
            return Object.keys(newSinks)
                .map(k => ({ [k]: adapt_1.adapt(newSinks[k]) }))
                .reduce(Object.assign, {});
        }
        return sinks;
    };
}
exports.modalify = modalify;
function centerHTML(child) {
    return dom_1.h('div', {
        style: {
            width: '100%',
            height: '100%',
            position: 'relative',
            delayed: undefined,
            remove: undefined
        }
    }, [
        dom_1.h('div', {
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
exports.centerHTML = centerHTML;
function displayModals(modals, background = 'rgba(0,0,0,0.8)', zIndex = 500) {
    const processedModals = modals
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
    }, dom_1.h('div.cyclejs-modal-dimmer', {}, [centerHTML(dom_1.h('div', {
            hook: {
                insert: (vnode) => {
                    vnode.elm.addEventListener('click', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    });
                }
            }
        }, processedModals))]));
}
function wrapModals(modals, containerClass = null) {
    const wrapper = child => dom_1.h('div', containerClass ? {
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
function addStyles(styles, vnode) {
    return Object.assign({}, vnode, { data: Object.assign({}, (vnode.data || {}), { style: Object.assign({}, (vnode.data.style || {}), styles) }) });
}
//# sourceMappingURL=modalify.js.map