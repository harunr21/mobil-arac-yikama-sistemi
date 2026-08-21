'use client';

import { useState } from 'react';
import { services } from '../content';

function ServicePanel({ index }: { index: number }) {
  const service = services[index];
  return (
    <article className={`package-card tone-${service.accent}`}>
      {service.popular && <span className="popular-label">En çok tercih edilen</span>}
      <span className="package-number">0{index + 1}</span>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <strong>{service.price}</strong>
      <span className="duration">Yaklaşık {service.duration}</span>
      <ul>{service.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
      <a className="card-cta" href={`/randevu?hizmet=${service.slug}`}>Bu paketi seç</a>
    </article>
  );
}

export function ServiceComparison({ compact = false }: { compact?: boolean }) {
  const [current, setCurrent] = useState(0);
  const go = (delta: number) => setCurrent((current + delta + services.length) % services.length);
  return (
    <div className={compact ? 'comparison compact' : 'comparison'}>
      <div className="desktop-packages">
        {services.map((service, index) => <ServicePanel key={service.slug} index={index} />)}
      </div>
      <div className="mobile-packages" aria-live="polite">
        <ServicePanel index={current} />
        <div className="carousel-controls">
          <button type="button" onClick={() => go(-1)} aria-label="Önceki paket">←</button>
          <div className="carousel-dots" aria-label={`${current + 1} / ${services.length}`}>
            {services.map((service, index) => <button key={service.slug} type="button" className={index === current ? 'active' : ''} onClick={() => setCurrent(index)} aria-label={`${service.name} paketini göster`} />)}
          </div>
          <strong>{current + 1}/{services.length}</strong>
          <button type="button" onClick={() => go(1)} aria-label="Sonraki paket">→</button>
        </div>
      </div>
    </div>
  );
}
