/** Account sign-in is deferred while this deployment uses browser demo sessions. */
export function accountAuthUnavailable() {
  return Response.json(
    {
      code: "DEMO_MODE",
      error: "Account sign-in is not available in this demo. Open the app to continue.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
