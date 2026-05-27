import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    let userId = "";
    try {
      const authResult = await auth();
      userId = authResult.userId || "";
    } catch (e) {
      // Dev fallback: missing clerk keys
    }

    if (!userId) {
      // Local dev fallback
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
      else return jsonOk({ nodes: [], edges: [] });
    }

    // Fetch Mental Models with linked Problems and Tags
    const models = await prisma.mentalModel.findMany({
      where: { userId },
      include: {
        problems: {
          include: {
            problem: {
              select: { 
                id: true, 
                title: true, 
                fsrsStability: true, 
                fsrsDifficulty: true,
                fsrsState: true 
              }
            }
          }
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      }
    });

    const nodes: any[] = [];
    const edges: any[] = [];

    // Simple layout heuristic (in production, use dagre or elkjs for perfect placement)
    // Here we'll let React Flow handle initial rendering or randomized clusters.
    let xOffset = 0;
    let yOffset = 0;

    models.forEach((model, idx) => {
      // Calculate aggregate mastery from linked problems (0 to 100)
      const linkedProblems = model.problems.map(p => p.problem);
      let avgStability = 0;
      if (linkedProblems.length > 0) {
        avgStability = linkedProblems.reduce((acc, p) => acc + (p.fsrsStability || 0), 0) / linkedProblems.length;
      }
      
      const masteryScore = Math.min(100, Math.max(0, avgStability * 10)); // Arbitrary scaling for the blueprint

      // Push Mental Model Node (Primary)
      nodes.push({
        id: `mm-${model.id}`,
        type: 'mentalModel',
        position: { x: (idx % 5) * 300, y: Math.floor(idx / 5) * 300 },
        data: {
          label: model.name,
          type: model.type,
          masteryScore,
          confidence: model.confidence,
          problems: linkedProblems
        }
      });

      // Push linked Problems and Edges
      linkedProblems.forEach((p, pIdx) => {
        const pId = `prob-${p.id}`;
        if (!nodes.find(n => n.id === pId)) {
          nodes.push({
            id: pId,
            type: 'problem',
            position: { x: (idx % 5) * 300 + (Math.random() * 150 - 75), y: Math.floor(idx / 5) * 300 + 150 + (pIdx * 50) },
            data: { label: p.title, stability: p.fsrsStability }
          });
        }

        edges.push({
          id: `e-mm-${model.id}-p-${p.id}`,
          source: `mm-${model.id}`,
          target: pId,
          animated: true,
          style: { strokeWidth: 2, stroke: masteryScore > 70 ? '#10b981' : '#6366f1' }, // Green if mastered, Indigo otherwise
        });
      });

      // Push linked Tags and Edges
      model.tags.forEach((t) => {
        const tag = t.tag;
        const tId = `tag-${tag.id}`;
        if (!nodes.find(n => n.id === tId)) {
          nodes.push({
            id: tId,
            type: 'tag',
            position: { x: (idx % 5) * 300 - 150, y: Math.floor(idx / 5) * 300 - 100 },
            data: { label: tag.name, color: tag.color }
          });
        }

        edges.push({
          id: `e-mm-${model.id}-t-${tag.id}`,
          source: tId, // Tag -> Mental Model
          target: `mm-${model.id}`,
          animated: false,
          style: { strokeWidth: 1, stroke: tag.color || '#a1a1aa' },
        });
      });
    });

    return jsonOk({ nodes, edges });
  } catch (error) {
    return handleApiError(error);
  }
}
