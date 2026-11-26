export default function WorkspaceSignIn() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-[#2E2B1A]">
      <h1 className="text-3xl font-bold">Workspace sign-in</h1>
      <p className="mt-3">Use the short-lived session token issued by your workspace operator.</p>
      <form method="post" action="/api/workspace/session" className="mt-8 flex flex-col gap-3">
        <label htmlFor="session" className="font-semibold">Session token</label>
        <input id="session" name="session" type="password" autoComplete="off" required maxLength={2048} className="rounded-xl border px-4 py-3" />
        <button type="submit" className="self-start rounded-full bg-[#ECE5CC] px-5 py-2 font-semibold">Sign in</button>
      </form>
    </main>
  );
}
