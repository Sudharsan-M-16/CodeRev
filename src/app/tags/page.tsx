import { CreateTagForm } from "@/components/tags/CreateTagForm";
import { TagHierarchyGraph } from "@/components/tags/TagHierarchyGraph";

export default function TagsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Tags & topic graph</h1>
      <TagHierarchyGraph />
      <CreateTagForm />
    </div>
  );
}
