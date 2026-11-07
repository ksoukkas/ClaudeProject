import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell
      title="About"
      description="What this prototype does, where its data comes from, and what is assumed."
    >
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Sources</h2>
        <Placeholder label="list of laws, datasets and programs used, each with a URL and the date checked." />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Assumptions</h2>
        <Placeholder label="every number the tool assumes, labelled ASSUMPTION, with what it is based on." />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">What is real and what is mocked</h2>
        <Placeholder label="a table of each part and whether it is working, partly working or mocked." />
      </section>
    </PageShell>
  );
}
