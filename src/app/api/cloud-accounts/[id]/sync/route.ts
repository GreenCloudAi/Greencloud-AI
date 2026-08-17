import { NextResponse } from "next/server";
import { IngestionService } from "@/services/ingestion";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cloudAccountId = params.id;
    if (!cloudAccountId) {
      return NextResponse.json(
        { success: false, error: "Cloud account ID is required." },
        { status: 400 }
      );
    }

    const result = await IngestionService.syncCloudAccount({ cloudAccountId });

    return NextResponse.json({
      success: true,
      message: `Successfully synced account ${cloudAccountId}`,
      ingestedCount: result.ingestedCount
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Ingestion sync failed" },
      { status: 500 }
    );
  }
}
