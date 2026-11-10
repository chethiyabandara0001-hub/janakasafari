'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Something went wrong</h2>
      <button
        onClick={() => reset()}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          backgroundColor: '#f5a623',
          color: '#000000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
