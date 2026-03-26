/**
 * Widget registry — maps widget `type` strings to their render components.
 * To add a new widget: import the component and add an entry to WIDGET_REGISTRY.
 */

import KnowledgeBaseWidget from './KnowledgeBaseWidget'

const WIDGET_REGISTRY = {
  knowledge_base_results: KnowledgeBaseWidget,
}

/**
 * Renders a widget inline given its data object (which must have a `type` field).
 * Unknown widget types are silently ignored.
 */
export default function Widget({ data }) {
  if (!data?.type) return null
  const Component = WIDGET_REGISTRY[data.type]
  if (!Component) return null
  return <Component data={data} />
}
