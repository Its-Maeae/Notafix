export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)', padding: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '1.1rem', color: 'white',
        letterSpacing: '-0.03em', marginBottom: 24,
      }}>NF</div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Kein Internet</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 280, lineHeight: 1.6 }}>
        Deine gespeicherten Noten werden angezeigt sobald du wieder verbunden bist.
      </p>
    </div>
  )
}
