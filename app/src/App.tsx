import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate, RouterProvider, useParams } from 'react-router';
import { Layout } from './components/Layout';
import { getReadyTrack, TRACKS } from './content/tracks';
import { findModule } from './state/progress';
import { HomePage } from './pages/HomePage';
import { TrackPage } from './pages/TrackPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Pages that need the editor or the SQL engine load on demand, so the home
// page and roadmaps stay small.
const ModulePage = lazy(() => import('./pages/ModulePage').then(m => ({ default: m.ModulePage })));
const ExercisePage = lazy(() => import('./pages/ExercisePage').then(m => ({ default: m.ExercisePage })));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
const ScratchpadPage = lazy(() => import('./pages/ScratchpadPage').then(m => ({ default: m.ScratchpadPage })));
const ClusterPlaygroundPage = lazy(() => import('./pages/ClusterPlaygroundPage').then(m => ({ default: m.ClusterPlaygroundPage })));

const Loading = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="loading" aria-live="polite">Loading…</div>}>{children}</Suspense>
);

/*
 * URLs (hash routing, so the static build works on any host, GitHub Pages included):
 *   #/                              all tracks
 *   #/sql                           track roadmap
 *   #/sql/playground                free SQL sandbox (Python tracks: a scratchpad; DevOps: a cluster)
 *   #/sql/join                      module: lesson + practice list
 *   #/sql/join/never-sold           exercise workspace
 */

function TrackRoute() {
  const { trackId } = useParams();
  const track = getReadyTrack(trackId);
  if (track) return <TrackPage track={track} />;
  // A planned track: send people to the home page, where its card explains what is coming.
  return TRACKS.some(t => t.id === trackId) ? <Navigate to="/" replace /> : <NotFoundPage what="track" />;
}

function PlaygroundRoute() {
  const track = getReadyTrack(useParams().trackId);
  if (!track?.playground) return <NotFoundPage />;
  return <Loading>{track.language === 'python' ? <ScratchpadPage /> : track.language === 'shell' ? <ClusterPlaygroundPage /> : <PlaygroundPage />}</Loading>;
}

function ModuleRoute() {
  const { trackId, moduleId } = useParams();
  const track = getReadyTrack(trackId);
  const module = track && findModule(track, moduleId);
  return track && module ? <Loading><ModulePage key={module.id} track={track} module={module} /></Loading> : <NotFoundPage what="topic" />;
}

function ExerciseRoute() {
  const { trackId, moduleId, slug } = useParams();
  const track = getReadyTrack(trackId);
  const module = track && findModule(track, moduleId);
  const exercise = module?.exercises.find(e => e.slug === slug);
  if (!track || !module || !exercise) return <NotFoundPage what="problem" />;
  // key: a new exercise gets fresh editor and output state.
  return (
    <Loading>
      <ExercisePage key={`${module.id}/${exercise.slug}`} track={track} module={module} exercise={exercise} />
    </Loading>
  );
}

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/:trackId', element: <TrackRoute /> },
      { path: '/:trackId/playground', element: <PlaygroundRoute /> },
      { path: '/:trackId/:moduleId', element: <ModuleRoute /> },
      { path: '/:trackId/:moduleId/:slug', element: <ExerciseRoute /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
