import type {
  SolveRequest,
  SolveResponse,
  ExpansionRequest,
  ExpansionResponse,
  JobSubmitResponse,
  JobStatusResponse,
  JobProgress,
  MutationGoal,
} from "../types/greenhouse";

const API_BASE = import.meta.env.DEV ? "/api" : "https://api.skyshards.com";

// Polling interval for job status checks (ms)
const POLL_INTERVAL = 500;

/**
 * Submit a solve job to the queue.
 * Returns the job ID for status polling.
 */
export async function submitSolveJob(request: SolveRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/greenhouse/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "greenhouse",
      params: {
        cells: request.cells,
        targets: request.targets,
        priorities: request.priorities || {},
        locks: request.locks || [],
      },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to submit job: ${response.statusText}`);
  }

  const result: JobSubmitResponse = await response.json();
  return result.job_id;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE}/greenhouse/jobs/${jobId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Job not found");
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/greenhouse/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to cancel job: ${response.statusText}`);
  }
}

export interface SolveJobCallbacks {
  onProgress?: (progress: JobProgress) => void;
  onQueuePosition?: (position: number) => void;
  onPreviewUpdate?: (result: SolveResponse) => void;
}

export async function solveGreenhouseWithJob(
  request: SolveRequest,
  callbacks?: SolveJobCallbacks,
  abortSignal?: AbortSignal
): Promise<SolveResponse> {
  // Submit the job
  const jobId = await submitSolveJob(request);

  // Poll for completion
  return new Promise((resolve, reject) => {
    let cancelled = false;

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener("abort", async () => {
        cancelled = true;
        try {
          await cancelJob(jobId);
        } catch {
          // Ignore cancel errors
        }
      });
    }

    const poll = async () => {
      if (cancelled) {
        reject(new Error("Job cancelled"));
        return;
      }

      try {
        const status = await getJobStatus(jobId);

        switch (status.status) {
          case "queued":
            if (status.queue_position && callbacks?.onQueuePosition) {
              callbacks.onQueuePosition(status.queue_position);
            }
            setTimeout(poll, POLL_INTERVAL);
            break;

          case "running":
            if (status.progress) {
              // Call progress callback
              if (callbacks?.onProgress) {
                callbacks.onProgress(status.progress);
              }
              
              // If we have a preview solution, call preview callback
              if (
                status.progress.preview_placements &&
                status.progress.preview_mutations &&
                callbacks?.onPreviewUpdate
              ) {
                // Both preview and final result now use the same position/size format
                callbacks.onPreviewUpdate({
                  status: "SOLVING",
                  total_cells_used: status.progress.preview_cells_used || 0,
                  placements: status.progress.preview_placements,
                  mutations: status.progress.preview_mutations,
                });
              }
            }
            setTimeout(poll, POLL_INTERVAL);
            break;

          case "completed":
            if (status.result) {
              resolve(status.result);
            } else {
              reject(new Error("Job completed but no result returned"));
            }
            break;

          case "failed":
            reject(new Error(status.error || "Job failed"));
            break;

          case "cancelled":
            // Check if we have a partial result
            if (status.result) {
              resolve(status.result);
            } else {
              reject(new Error("Job was cancelled"));
            }
            break;

          default:
            setTimeout(poll, POLL_INTERVAL);
        }
      } catch (error) {
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

export async function optimizeExpansion(request: ExpansionRequest): Promise<ExpansionResponse> {
  const response = await fetch(`${API_BASE}/greenhouse/expansion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Expansion optimizer error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Solve greenhouse synchronously (direct response, no job queue).
 * Used for quick solves like mutation requirement previews.
 */
export async function solveGreenhouseDirect(
  cells: [number, number][],
  targets: MutationGoal[],
  abortSignal?: AbortSignal
): Promise<SolveResponse> {
  const response = await fetch(`${API_BASE}/greenhouse/solver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      req: {
        cells,
        targets,
        "remove_unused_crops": false
      },
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Greenhouse solver error: ${response.statusText}`);
  }

  return response.json();
}
