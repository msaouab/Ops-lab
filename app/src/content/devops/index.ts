import type { ReadyTrack } from '../types';
import containersModule from './modules/containers';
import k8sBasicsModule from './modules/k8s-basics';
import workloadsModule from './modules/workloads';
import servicesModule from './modules/services';
import configModule from './modules/config';
import debuggingModule from './modules/debugging';
import cicdModule from './modules/cicd';
import gitopsModule from './modules/gitops';
import deliveryModule from './modules/delivery';

export const devopsTrack: ReadyTrack = {
  id: 'devops',
  status: 'ready',
  title: 'DevOps',
  mark: 'OPS',
  language: 'shell',
  tagline: 'Docker, Kubernetes, CI/CD and GitOps, practised on a simulated cluster in your browser.',
  headline: 'Ship it like a team: <span class="q">Docker</span> to <span class="q">GitOps</span>.',
  lede: 'Each topic teaches one tool by doing: build images, drive a Kubernetes cluster with kubectl, debug broken releases, write CI/CD workflows and GitOps manifests. Everything runs in your browser and is checked as you go, then the same skills carry over to your real kube-lab cluster.',
  playground: true,
  modules: [
    containersModule, k8sBasicsModule, workloadsModule, servicesModule, configModule,
    debuggingModule, cicdModule, gitopsModule, deliveryModule,
  ],
  layout: [
    ['containers'],
    ['k8s-basics'],
    ['workloads', 'services'],
    ['config'],
    ['debugging', 'cicd'],
    ['gitops'],
    ['delivery'],
  ],
};
