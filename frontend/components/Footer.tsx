import { Brand } from "@/components/Navbar";

const socialLinks = [
  { label: "Facebook", glyph: "f", href: "https://www.facebook.com" },
  { label: "LinkedIn", glyph: "in", href: "https://www.linkedin.com" },
  { label: "X", glyph: "♥", href: "https://x.com" },
  { label: "GitHub", glyph: "⌁", href: "https://github.com" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <Brand compact />
        <p>© 2024 Aqeel Shahzad. All Rights Reserved.</p>
        <div className="footer__socials" aria-label="Social links">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.href} aria-label={link.label}>
              {link.glyph}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
