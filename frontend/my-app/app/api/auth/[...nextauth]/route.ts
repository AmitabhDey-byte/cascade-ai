export async function GET() {
  return Response.json({ status: "not_configured" }, { status: 404 });
}

export async function POST() {
  return Response.json({ status: "not_configured" }, { status: 404 });
}
