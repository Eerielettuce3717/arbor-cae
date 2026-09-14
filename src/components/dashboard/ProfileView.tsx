export function ProfileView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
          Identity
        </p>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          User Profile
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Arbor is local-first. There is no cloud account on this machine.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <dl className="max-w-lg border border-border">
          <Row term="Display name" detail="You" />
          <Row term="Owner id" detail="local-user" />
          <Row term="Home" detail="This device" />
          <Row term="Units" detail="mm · ISO" />
        </dl>
      </div>
    </div>
  );
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {term}
      </dt>
      <dd className="font-medium text-foreground">{detail}</dd>
    </div>
  );
}

export default ProfileView;
