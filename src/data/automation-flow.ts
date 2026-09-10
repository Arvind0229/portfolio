/**
 * The shape of an automation, as a graph.
 *
 * This is the same work the linear pipeline describes, but drawn as what it
 * actually is: a bot sitting at the centre, pulling from several systems and
 * pushing a result out the other side. The linear view suits the *delivery*
 * process on the architecture page (requirement → sign-off → build → UAT →
 * deploy → support), which really is a sequence. This one suits the *runtime*,
 * which is not.
 *
 * Everything named here is drawn from the resume: the stages are the ones the
 * bots actually run, and the four sources are the systems they actually touch
 * — APIs, five database engines, the front-end applications automated where no
 * back-end access exists, and the MIS/reporting outputs. Nothing is invented
 * to make the diagram look busier.
 */

export interface FlowNode {
  readonly id: string;
  readonly label: string;
  /** One short line under the label. Omit where the label says enough. */
  readonly detail?: string;
}

/** The main chain, left to right. `bot` is the emphasised node. */
export const flowStages: readonly FlowNode[] = [
  { id: 'manual', label: 'Manual process', detail: 'Queue / trigger' },
  { id: 'bot', label: 'RPA bot', detail: 'TruBot' },
  { id: 'processing', label: 'Data processing', detail: 'SQL · Python' },
  { id: 'validation', label: 'Validation', detail: 'Exception rules' },
  { id: 'result', label: 'Automated result', detail: 'MIS · alerts' },
];

/** What the bot reaches into and writes back to. */
export const flowSources: readonly FlowNode[] = [
  { id: 'apis', label: 'APIs' },
  { id: 'databases', label: 'Databases' },
  { id: 'applications', label: 'Applications' },
  { id: 'reports', label: 'Reports' },
];

/** The qualities the runtime is built for. Shown beside the graph. */
export const flowQualities: readonly string[] = [
  'Scalable',
  'Secure',
  'Reliable',
  'Monitored',
];

/**
 * A single run, step by step.
 *
 * What one of Arvind's bots actually does between the trigger and the mail
 * landing in someone's inbox — read, transform, check against the rules, write
 * back, tell people. It is drawn from the work described in the resume, and it
 * is deliberately generic across the bots rather than specific to one, because
 * no single automation is being reported on here.
 *
 * The panel that renders this is explicitly labelled illustrative. It is a
 * demonstration of the shape of a run, not telemetry from a live system, and
 * nothing about it should be read as a status feed.
 */
export interface RunStep {
  readonly id: string;
  readonly label: string;
  /** What the bot is doing during this step, in one short phrase. */
  readonly detail: string;
}

export const runSteps: readonly RunStep[] = [
  { id: 'read', label: 'Reading data', detail: 'Queue, mailbox, source systems' },
  { id: 'process', label: 'Processing', detail: 'Extract, transform, reconcile' },
  { id: 'validate', label: 'Validating', detail: 'Business rules and exceptions' },
  { id: 'execute', label: 'Executing', detail: 'Writing back to LOS / LMS' },
  { id: 'report', label: 'Reporting', detail: 'MIS out, stakeholders notified' },
];
