"use client";

import { X } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteTradeScreenshot } from "@/server/actions/trades";

export function ImageThumb({
  id,
  url,
  caption,
}: {
  id: string;
  url: string | null;
  caption: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <figure className="group relative overflow-hidden rounded-lg border">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={caption ?? "screenshot"}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="aspect-video w-full bg-muted" />
      )}
      <Button
        type="button"
        size="icon"
        variant="destructive"
        disabled={pending}
        className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() =>
          startTransition(async () => {
            await deleteTradeScreenshot(id);
          })
        }
      >
        <X className="h-4 w-4" />
      </Button>
      {caption && (
        <figcaption className="px-3 py-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
