import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/workflow/$workflowId/forms/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/workflow/$workflowId/forms/"!</div>
}
