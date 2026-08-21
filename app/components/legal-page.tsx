export function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <main className="legal-page"><header><p className="eyebrow dark">{eyebrow}</p><h1>{title}</h1><p>Son güncelleme: 21 Ağustos 2026</p></header><article>{children}<div className="legal-warning"><strong>Yayın öncesi notu</strong><p>Bu metin işlevsel taslak niteliğindedir. Gerçek şirket unvanı, iletişim kanalları, saklama süreleri ve hukuki sorumluluklar yayın öncesinde yetkili hukuk danışmanı tarafından güncellenmelidir.</p></div></article></main>;
}
