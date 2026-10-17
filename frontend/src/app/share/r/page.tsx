import type { Metadata } from "next";
import Link from "next/link";
import { SharePreviewGrid } from "@/components/SharePreviewGrid";
import { buildSharePlayUrl } from "@/lib/shareResult";
import {
  decodeSharePreview,
  encodeSharePreviewQuery,
  sharePreviewDescription,
  sharePreviewTitle,
} from "@/lib/sharePreview";
import { siteOriginFromEnv } from "@/lib/siteUrl";
import { DIFFICULTIES } from "@detonate/engine";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function metadataBase(): URL {
  return new URL(siteOriginFromEnv() ?? "http://localhost:3000");
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const preview = decodeSharePreview(params);
  if (!preview) {
    return {
      title: "Share",
      description: "Detonate — competitive Minesweeper.",
    };
  }

  const title = sharePreviewTitle(preview);
  const description = sharePreviewDescription(preview);
  const qs = encodeSharePreviewQuery(preview);
  const imagePath = `/share/r/opengraph-image?${qs}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

export default async function ShareResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preview = decodeSharePreview(params);

  if (!preview) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">Invalid share link</h1>
        <p className="text-sm text-[var(--muted)]">This result link is incomplete or expired.</p>
        <Link href="/" className="btn btn-primary mx-auto">
          Go home
        </Link>
      </div>
    );
  }

  const difficulty = DIFFICULTIES[preview.difficultyId] ?? DIFFICULTIES.beginner;
  const origin = metadataBase().origin;
  const playHref = buildSharePlayUrl(
    origin,
    preview.boardKind,
    preview.difficultyId,
    preview.seed,
  );
  const title = sharePreviewTitle(preview);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-8 text-center">
      <div>
        <p className="eyebrow">Detonate result</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{sharePreviewDescription(preview)}</p>
      </div>
      <SharePreviewGrid difficultyId={preview.difficultyId} seed={preview.seed} maxWidth={320} />
      <p className="font-mono text-xs text-[var(--muted)]">
        {difficulty.label} · {difficulty.width}×{difficulty.height} · {difficulty.mines} mines
        {preview.boardKind === "daily" && preview.dailyDate
          ? ` · ${preview.dailyDate} UTC`
          : ""}
      </p>
      <Link href={playHref} className="btn btn-primary">
        Play this board
      </Link>
    </div>
  );
}
