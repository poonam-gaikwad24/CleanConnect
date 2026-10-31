import type { TaskStatus } from '../api/maintenanceTasks';
import { CheckCircleIcon } from './ui/icons';

// The maintenance workflow as four steps. REVISION_REQUIRED sends the task
// back to the staff member, so it is shown as "In progress — needs rework"
// rather than as a fifth step. Each step says Done / Current / Next in words
// (and with an icon), so the state never depends on colour.
const STEPS: { status: TaskStatus; label: string }[] = [
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'VERIFIED', label: 'Verified' },
];

export function currentStepIndex(status: TaskStatus): number {
  if (status === 'REVISION_REQUIRED') return 1;
  return STEPS.findIndex((s) => s.status === status);
}

function TaskProgress({ status }: { status: TaskStatus }) {
  const current = currentStepIndex(status);
  const finished = status === 'VERIFIED';

  return (
    <ol aria-label="Task progress" className="space-y-3">
      {STEPS.map((step, index) => {
        const done = index < current || (finished && index === current);
        const isCurrent = index === current && !finished;
        const rework = isCurrent && status === 'REVISION_REQUIRED';

        return (
          <li
            key={step.status}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                done
                  ? 'border-green-700 bg-green-700 text-white'
                  : isCurrent
                    ? rework
                      ? 'border-red-700 bg-white text-red-800'
                      : 'border-brand-700 bg-brand-50 text-brand-800'
                    : 'border-slate-300 bg-white text-slate-500'
              }`}
            >
              {done ? <CheckCircleIcon className="h-4 w-4" /> : index + 1}
            </span>
            <div>
              <p className={`text-sm ${isCurrent ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>
                {step.label}
              </p>
              <p className="text-xs text-slate-600">
                {done ? 'Done' : isCurrent ? (rework ? 'Current — needs rework' : 'Current') : 'Next'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default TaskProgress;
