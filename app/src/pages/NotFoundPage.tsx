import { Link } from 'react-router';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="empty">
      <h1>This {what} doesn’t exist</h1>
      <p>The link may be old, or the content moved.</p>
      <Link className="btn primary" to="/">Back to all tracks</Link>
    </div>
  );
}
