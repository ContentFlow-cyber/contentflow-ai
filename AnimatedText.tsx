/** Headline whose letters animate in and then flow with a gradient wave. Text stays readable by screen readers. */
export function AnimatedText({ text }: { text: string }) {
  let n = 0;
  return (
    <span aria-label={text} role="text">
      {text.split(" ").map((word, w, arr) => (
        <span key={w} aria-hidden className="fx-word">
          {Array.from(word).map((ch, k) => (
            <span key={k} className="fx-letter" style={{ ["--i" as string]: n++ }}>{ch}</span>
          ))}
          {w < arr.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
