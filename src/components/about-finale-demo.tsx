/**
 * The About page's hero (ticket 28): War Week XI's Finale on a phone, from
 * the Start button to the final Standings, as a silent loop with a poster.
 * Both files under `public/about/` are written by `scripts/about-media.ts`
 * from the seeded demo, never by hand. Under `prefers-reduced-motion` the
 * video is hidden and the poster (the Finale's Start screen) stands in its
 * place.
 */
const DESCRIPTION =
  "War Week XI's Finale on a phone: Start, then each Team counting up into its place.";

export function AboutFinaleDemo() {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="border-foreground/20 bg-background w-56 overflow-hidden rounded-[2.25rem] border-8 shadow-[0_0_80px_-20px_var(--primary)] sm:w-64">
        <div className="bg-background aspect-[390/844] w-full">
          <video
            className="h-full w-full object-cover motion-reduce:hidden"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/about/finale-poster.png"
            aria-label={DESCRIPTION}
            src="/about/finale.mp4"
          />
          <img
            className="hidden h-full w-full object-cover motion-reduce:block"
            src="/about/finale-poster.png"
            width={780}
            height={1688}
            alt={DESCRIPTION}
          />
        </div>
      </div>
      <figcaption className="text-foreground/60 max-w-xs text-center text-xs">
        The Finale: at closing ceremonies, press Start and the Standings count
        in from last place to first.
      </figcaption>
    </figure>
  );
}
