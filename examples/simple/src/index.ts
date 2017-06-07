import xs, { Stream } from "xstream";
import { run } from "@cycle/run";
import { button, div, DOMSource, makeDOMDriver, span, VNode } from "@cycle/dom";

import { Message, ModalAction, wrappedModalify } from "../../../src/modalify";
import { SemanticUIModalWrapper } from "./SemanticUIModalWrapper";

interface Sources {
    DOM : DOMSource;
    modal : Stream<Message>;
}

interface Sinks {
    DOM? : Stream<VNode>;
    modal? : Stream<ModalAction>;
}

function main({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(button('.button', ['open modal'])),
        modal: DOM.select('.button').events('click')
            .mapTo({
                type: 'open',
                props: {
                    title : "Hello World!"
                },
                component: modal
            } as ModalAction)
    };
}

function modal({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(div('.div', [
            span('.span', ['This is a modal. Yeah? :)']),
            button('.button', ['close'])
        ])),
        modal: DOM.select('.button').events('click')
            .mapTo({ type: 'close' } as ModalAction)
    };
}

run(wrappedModalify(main, SemanticUIModalWrapper), {
    DOM: makeDOMDriver('#app')
});
