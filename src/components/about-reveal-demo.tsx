/**
 * The About page's hero (ticket 28): War Week XI's leaderboard on a phone,
 * hidden and then Revealed, as a silent loop with a poster. Both files under
 * `public/about/` are written by `scripts/about-media.ts` from the seeded
 * demo, never by hand. Under `prefers-reduced-motion` the video is hidden
 * and the poster (the hidden Standings) stands in its place.
 */
const DESCRIPTION =
  "War Week XI's leaderboard on a phone: the Standings hidden behind a lock, then the Reveal counting each Team up into its place.";

export function AboutRevealDemo() {
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
            poster="/about/reveal-poster.png"
            aria-label={DESCRIPTION}
            src="/about/reveal.mp4"
          />
          <img
            className="hidden h-full w-full object-cover motion-reduce:block"
            src="/about/reveal-poster.png"
            width={780}
            height={1688}
            alt={DESCRIPTION}
          />
        </div>
      </div>
      <figcaption className="text-foreground/60 max-w-xs text-center text-xs">
        The Reveal: Standings stay hidden until an Organizer un-hides them, then
        every phone in the room counts up together.
      </figcaption>
    </figure>
  );
}
