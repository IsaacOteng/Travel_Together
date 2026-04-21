export default function SectionHead({ label }) {
  return (
    <div style={{
      padding: "10px 20px 6px",
      fontSize: 10, fontWeight: 800,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.25)",
    }}>
      {label}
    </div>
  );
}
