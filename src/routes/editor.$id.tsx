import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "@/components/Editor";

export const Route = createFileRoute("/editor/$id")({
  head: () => ({
    meta: [
      { title: "Editor — Gridora Studio" },
      { name: "description", content: "Edit your design in Gridora Studio." },
      { property: "og:title", content: "Editor — Gridora Studio" },
      { property: "og:description", content: "Design from scratch with Gridora Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  return <Editor key={id} id={id} />;
}
