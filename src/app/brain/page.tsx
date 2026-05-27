import { MentalModelGraph } from "@/components/graph/MentalModelGraph";

export const metadata = {
  title: "Brain Map | CodeRev",
};

export default function BrainPage() {
  return (
    <div className="flex-1 w-full h-full p-4 lg:p-8 pt-6 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Brain Map</h2>
        <div className="flex items-center space-x-2">
          {/* Controls can go here */}
        </div>
      </div>
      <div className="w-full h-[800px] mt-4 relative">
        <MentalModelGraph />
      </div>
    </div>
  );
}
