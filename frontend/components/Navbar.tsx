import Image from "next/image";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Vista Lab">
      <span className="brand__mark" aria-hidden="true">v</span>
      <span className="brand__name">Vista Lab</span>
    </div>
  );
}

export { Brand };

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Brand />
        <Image
          className="navbar__avatar"
          src="/avatars/profile.png"
          alt="Aqeel Shahzad"
          width={48}
          height={48}
          priority
        />
      </div>
    </header>
  );
}
