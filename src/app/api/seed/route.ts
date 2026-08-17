import { NextResponse } from "next/server";
import { seedDemoData } from "@/services/seed";

export async function POST() {
  try {
    await seedDemoData();
    return NextResponse.json({ success: true, message: "Demo data seeded successfully!" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Seeding failed" },
      { status: 500 }
    );
  }
}
