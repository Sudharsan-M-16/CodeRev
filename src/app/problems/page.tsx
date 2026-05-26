import Link from "next/link";
import { ProblemsDashboard } from "@/components/problems/ProblemsDashboard";
import { Button } from "@/components/ui/form";

export default function ProblemsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problems</h1>
        <Link href="/problems/new">
          <Button>Add problem</Button>
        </Link>
      </div>
      <ProblemsDashboard />
    </div>
  );
}
