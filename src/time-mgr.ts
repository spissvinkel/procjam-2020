export const ONE_SECOND         = 1000;                 // Milliseconds
export const TIME_FACTOR        = 1.0 / ONE_SECOND;     // Millisecond resolution
export const MAX_DELTA_SYS_TIME = 1000;                 // 1000 ms => 1 FPS
export const SIM_TIME_SECONDS   = 5 * TIME_FACTOR;      // Simulate in 5ms steps
export const INV_SIM_TIME_SECS  = 1 / SIM_TIME_SECONDS;

let lastSysTime      = 0;                            // Host hi res time - previous update (host wall clock)
let totalTime        = 0;                            // Total hi res time - may be capped/paused, etc. (game wall clock)
let deltaTimeSeconds = 0;                            // Delta time in seconds since last update (capped)

export const getLastSysTime      = (): number => lastSysTime;
export const getTotalTime        = (): number => totalTime;
export const getDeltaTimeSeconds = (): number => deltaTimeSeconds;

export const updateTime = (timeMillis: number): void => {
  const deltaSysTime = Math.min(timeMillis - lastSysTime, MAX_DELTA_SYS_TIME);
  lastSysTime = timeMillis;
  totalTime += deltaSysTime;
  deltaTimeSeconds = deltaSysTime * TIME_FACTOR;
};
