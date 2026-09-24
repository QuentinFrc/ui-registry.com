import Link from "next/link";

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:py-16">
      <Link
        className="text-muted-foreground text-sm hover:text-foreground"
        href="/"
      >
        ← Home
      </Link>
      <article className="prose-content flex flex-col gap-6">
        {children}
      </article>
    </main>
  );
}
