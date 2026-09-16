/* Shown while auth is being restored, before a protected route renders.
   Both route guards used to inline their own dark-navy spinner, which meant
   every protected page flashed #071422 before painting the cream app. */
export default function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground">
      <span
        className="h-9 w-9 rounded-full border-[3px] border-line"
        style={{ borderTopColor: "var(--tt-accent)", animation: "ttSpin .7s linear infinite" }}
      />
    </div>
  );
}
