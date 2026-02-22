export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '24px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-voice)',
          fontSize: 'var(--text-xl)',
          color: 'var(--chalk)',
        }}
      >
        What do you want to learn?
      </h1>
      <input
        type="text"
        autoFocus
        style={{
          fontFamily: 'var(--font-hand)',
          fontSize: 'var(--text-base)',
          color: 'var(--chalk)',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--stone)',
          outline: 'none',
          width: '360px',
          maxWidth: '80vw',
          padding: '12px 0',
        }}
      />
    </main>
  );
}
