import { runJob, type Job } from './simlib.ts';

process.on('message', (job: Job) => {
  process.send!(runJob(job));
});
