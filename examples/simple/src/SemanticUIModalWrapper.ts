import xs, { Stream } from "xstream";
import { div, DOMSource, i } from "@cycle/dom";
import { Close, Component, ModalAction, Props, Sinks, Sources } from "../../../src/modalify";
import { isNullOrUndefined } from "util";
import { extractSinks, mergeSinks } from "cyclejs-utils";
import { adapt } from "@cycle/run/lib/adapt";


export interface SemanticUIProps extends Props {
    title: string
}

export function SemanticUIModalWrapper(sources: Sources, component: Component, props: SemanticUIProps): Sinks {

    const hasProps = !isNullOrUndefined(props);
    const title = (hasProps && !isNullOrUndefined(props.title)) ? props.title : "";

    const compSinks: Sinks = component({...sources});

    const extractedSinks: Sinks = extractSinks(
        xs.of(component),
        Object.keys(compSinks)
    );

    const closeClick$: Stream<ModalAction> = (sources.DOM as DOMSource).select('.close.icon')
        .events('click')
        .mapTo({type: "close"} as Close);

    let newSinks = {
        ...mergeSinks(extractedSinks, compSinks),
        DOM: compSinks.DOM.map(content =>
            // Semantic ui style
            div(".ui.modal.transition.visible.active", [
                i(".close.icon"),
                div(".header", [title]),
                div(".content", [content])
            ])
        ),
        modal: xs.merge(extractedSinks.modal, compSinks.modal, closeClick$.mapTo({type: "close"} as Close))
    };

    return Object.keys(newSinks)
        .map(k => ({[k]: adapt(newSinks[k])}))
        .reduce(Object.assign, {});

}