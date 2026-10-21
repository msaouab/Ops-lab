import type { Module } from '../../types';
import { all, command, deploy, healthy, imageOf, quiz } from '../rules';

const debuggingModule: Module = {
  id: 'debugging',
  title: 'Debugging a Cluster',
  tags: 'get → describe → logs → events · fix · verify',
  parents: ['config'],
  summary: 'Releases break. Learn one calm method that finds the cause every time, and the five pod states that cover most incidents.',
  lesson: [
    {
      heading: 'One method for every incident',
      body: 'Work from the outside in, and do not change anything until you can say what is wrong:',
      list: [
        '<b>1. What is broken?</b> <code>kubectl get pods</code>: look at STATUS, READY and RESTARTS.',
        '<b>2. Why?</b> <code>kubectl describe pod</code>: read the <b>Events</b> at the bottom, then the container\'s Last State.',
        '<b>3. What did the app say?</b> <code>kubectl logs</code> (add <code>--previous</code> for the run that crashed).',
        '<b>4. What changed?</b> <code>kubectl rollout history</code>, <code>kubectl get events --sort-by=.lastTimestamp</code>.',
        '<b>5. Fix, then verify</b> with the same command that showed the problem.',
      ],
      note: { label: 'Interview tip', body: 'If users are affected, restore service first (<code>rollout undo</code>), then debug. Saying this out loud in an interview shows production experience.' },
    },
    {
      heading: 'The states you will meet',
      body: 'Each status points to a different layer:',
      list: [
        '<code>ImagePullBackOff</code> / <code>ErrImagePull</code>: the image name or tag is wrong, or the registry needs credentials.',
        '<code>CrashLoopBackOff</code>: the container starts and exits. Read the logs (often missing config).',
        '<code>Pending</code>: no node can take the pod. <code>describe</code> says why (requests too big, a taint, an unbound volume).',
        '<code>OOMKilled</code> (in Last State): the container used more memory than its limit.',
        '<code>Running</code> but <code>0/1</code> READY: the readiness probe fails, so it gets no traffic.',
        '<code>CreateContainerConfigError</code>: a referenced ConfigMap or Secret (or key) does not exist.',
      ],
    },
    {
      heading: 'Worked example: an image that does not exist',
      body: 'Here the web release <code>2.1.1</code> was pushed with a tag that was never built. The old pods keep serving (the rollout waits for ready pods), so users are fine, but the release is stuck. Run it and follow the trail.',
      cluster: 'image-typo',
      code: `kubectl get pods -n shop -l app=web
kubectl describe pod -n shop -l app=web
kubectl rollout history deploy/web -n shop`,
    },
    {
      heading: 'Worked example: a crash loop',
      body: 'Worker <code>1.5.0</code> restarts again and again. The events only say "Back-off restarting failed container"; the reason is in the application\'s own logs.',
      cluster: 'missing-env',
      code: `kubectl get pods -n shop -l app=worker
kubectl logs deploy/worker -n shop`,
    },
    {
      heading: 'Events: the cluster\'s diary',
      body: 'Events record what controllers did and what failed, but they expire after about an hour. Sorting by time gives you the story of an incident.',
      cluster: 'pending',
      code: 'kubectl get events -n shop --sort-by=.lastTimestamp',
    },
  ],
  exercises: [
    command({
      slug: 'the-release-wont-pull',
      title: 'The release won\'t pull',
      difficulty: 'Easy',
      cluster: 'image-typo',
      mode: 'state',
      prompt: 'A web release went out a few minutes ago and one new pod is stuck. Find what is wrong and bring the <code>web</code> deployment back to a healthy, fully rolled out state on a version that exists.',
      hint: 'kubectl get pods -n shop -l app=web shows ImagePullBackOff. The tag 2.1.1 was never built: roll back with kubectl rollout undo deploy/web -n shop (or set image to 2.2.0, which exists).',
      solution: `kubectl get pods -n shop -l app=web
kubectl describe pod -n shop -l app=web
kubectl rollout undo deploy/web -n shop
kubectl get pods -n shop -l app=web`,
      check: c => all(
        () => (imageOf(c, 'shop', 'web').endsWith(':2.1.1') ? 'web still points at 2.1.1, which does not exist in the registry' : true),
        () => healthy(c, 'shop', 'web'),
      ),
    }),
    command({
      slug: 'stuck-in-pending',
      title: 'Stuck in Pending',
      difficulty: 'Medium',
      cluster: 'pending',
      mode: 'state',
      prompt: 'The new <code>reports</code> deployment never starts: its pod has been <code>Pending</code> for minutes. Find out why, and fix the deployment so the pod runs. The report job needs about a quarter of a CPU.',
      hint: 'kubectl describe pod -n shop -l app=reports shows "Insufficient cpu": it requests 4 CPUs and no node has that much. kubectl set resources deploy/reports -n shop --requests=cpu=250m.',
      solution: `kubectl get pods -n shop -l app=reports
kubectl describe pod -n shop -l app=reports
kubectl set resources deploy/reports -n shop --requests=cpu=250m
kubectl get pods -n shop -l app=reports`,
      check: c => healthy(c, 'shop', 'reports'),
    }),
    command({
      slug: 'out-of-memory',
      title: 'Out of memory',
      difficulty: 'Medium',
      cluster: 'oom',
      mode: 'state',
      prompt: 'Someone "tuned" the worker\'s resources to save memory, and now it keeps restarting. Confirm the cause, then give the <code>worker</code> a memory limit that lets it run (it needs about 300Mi; 512Mi is a safe limit).',
      hint: 'kubectl describe pod -n shop -l app=worker: Last State Terminated, Reason OOMKilled. kubectl set resources deploy/worker -n shop --limits=memory=512Mi.',
      solution: `kubectl get pods -n shop -l app=worker
kubectl describe pod -n shop -l app=worker
kubectl set resources deploy/worker -n shop --limits=memory=512Mi
kubectl get pods -n shop -l app=worker`,
      check: c => all(
        () => (String(deploy(c, 'shop', 'worker').spec.template.spec.containers[0].resources?.limits?.memory ?? '') ? true : 'the worker should keep a memory limit'),
        () => healthy(c, 'shop', 'worker'),
      ),
    }),
    quiz({
      slug: 'read-the-symptoms',
      title: 'Read the symptoms',
      difficulty: 'Medium',
      prompt: 'Match each symptom to its most likely cause, the way you would in an on-call shift.',
      hint: 'Pull problems are about the image, crash loops about the app, Pending about scheduling, 0/1 Running about probes.',
      questions: [
        { q: 'A pod shows ImagePullBackOff. Most likely cause?', options: ['The app crashed', 'The image tag does not exist or the registry needs credentials', 'The node is out of memory', 'The Service selector is wrong'], answer: 1, why: 'The kubelet cannot download the image. describe shows the registry\'s answer (not found, unauthorized).' },
        { q: 'A pod is CrashLoopBackOff. Where is the cause usually written?', options: ['In the node logs', 'In kubectl logs --previous (what the app printed before exiting)', 'In the Service', 'In etcd'], answer: 1, why: 'The container started and exited. The application\'s own output says why: a missing variable, a bad connection string, a stack trace.' },
        { q: 'A pod stays Pending. What does kubectl describe usually say?', options: ['Back-off restarting failed container', 'FailedScheduling: insufficient cpu/memory, or a taint / volume issue', 'Readiness probe failed', 'OOMKilled'], answer: 1, why: 'Pending means not scheduled yet: the scheduler explains in a FailedScheduling event which constraint no node satisfies.' },
        { q: 'Pods are Running 0/1 after a release and the rollout does not finish. Why?', options: ['The image is missing', 'The readiness probe fails, so new pods never become ready', 'Too many replicas', 'The namespace is full'], answer: 1, why: 'Running but not ready is a probe problem. The Deployment waits for ready pods before removing old ones, so the rollout stalls (safely).' },
        { q: 'Users see errors right after a release. What do you do first?', options: ['Read every log line', 'Roll back (rollout undo), then investigate calmly', 'Delete all pods', 'Increase replicas to 50'], answer: 1, why: 'Mitigate, then diagnose. Rolling back is fast and safe because the previous ReplicaSet is still there.' },
      ],
    }),
  ],
};

export default debuggingModule;
