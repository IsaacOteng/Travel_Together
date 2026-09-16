/* This used to be a 28px gradient square holding an emoji, with a Georgia
   serif title beside it and the explanation indented underneath — the exact
   "little icon on top, words below" pattern that says nothing the words
   don't. The emoji is gone. What's left is an editorial heading matching the
   sign-in screens, so the step reads as a question being asked rather than a
   form section being announced. */
export const SectionHead = ({ title, sub }) => (
  <header className="mb-6">
    <h1 className="m-0 font-display text-[clamp(24px,3vw,30px)] font-semibold leading-[1.15] text-ink">
      {title}
    </h1>
    {sub && (
      <p className="m-0 mt-2.5 max-w-[46ch] text-[14.5px] leading-[1.6] text-ink-soft">
        {sub}
      </p>
    )}
  </header>
);
