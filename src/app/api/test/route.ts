export async function POST(request: Request) {
  const body = await request.json()
  console.log("[test] received:", JSON.stringify(body, null, 2))
  return Response.json({ received: true })
}

export async function GET() {
  console.log("[test] GET received")
  return Response.json({ status: "ok" })
}
