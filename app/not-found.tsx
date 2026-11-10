import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you requested could not be found.</p>
      <Link href="/" style={{ color: '#f5a623', textDecoration: 'underline' }}>
        Return to Home
      </Link>
    </div>
  );
}
