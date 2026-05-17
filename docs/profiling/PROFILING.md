# Backend performance profiling — POST /logmeal/segment

## What was profiled

**Endpoint:** `POST /logmeal/segment`
**Input:** 640 × 480 JPEG meal image (~35 KB), forwarded to LogMeal segmentation API
**Environment:** local FastAPI dev server (`uvicorn --reload`), standard home broadband
**Tool:** [pyinstrument 5.0.1](https://pyinstrument.readthedocs.io/) — statistical wall-clock profiler

```bash
# Reproduce — pyinstrument HTML report
python -m pyinstrument -o docs/profiling/segment_profile.html \
    --renderer html backend/profile_run.py

# Reproduce — cProfile + flamegraph.pl SVG (Brendan Gregg format)
# Requires: pip install flameprof
#           git clone --depth=1 https://github.com/brendangregg/FlameGraph
python -m cProfile -o docs/profiling/profile.prof backend/profile_run.py
flameprof docs/profiling/profile.prof --format log > docs/profiling/profile.folded
FlameGraph/flamegraph.pl docs/profiling/profile.folded > docs/profiling/flamegraph.svg
```

Full request lifecycle from FastAPI handler entry through to JSON response,
including the outbound HTTPS call to `api.logmeal.com/v2/image/segmentation/complete`
and the Supabase Storage upload of the processed image.

---

## Results

| Phase | Wall time (ms) | Share |
|---|---|---|
| `httpx` outbound request + LogMeal response | ~3 100 | ~87 % |
| Supabase Storage upload (image_url) | ~290 | ~8 % |
| FastAPI request parsing & validation | ~40 | ~1 % |
| Image read + MIME normalisation | ~15 | < 1 % |
| JSON serialisation + response build | ~10 | < 1 % |
| **Total wall time** | **~3 550 ms** | |

pyinstrument flamegraph showed the call stack dominated by
`httpx._client.AsyncClient.send → httpcore … ssl.SSLSocket.read` for the
LogMeal call, confirming that Python execution time is negligible and
essentially all latency is network I/O.

---

## Identified bottleneck

**External network call to LogMeal API** — the `POST /image/segmentation/complete`
HTTPS request accounts for ≈ 87 % of total wall time.

The Python processing path (file read → MIME fix → JSON parse → Supabase write) is
under 5 % of total time and is not a meaningful optimisation target.

The 30-second timeout on the segment endpoint is appropriate: the LogMeal API
exhibits high variance (fast: ~1 s; slow: 10–25 s under load) and a shorter
timeout would produce spurious failures for real users.

---

## Decision: no optimisation warranted

The bottleneck is an external third-party API outside our control.
Existing mitigations already address the expected failure modes:

| Risk | Mitigation already in place |
|---|---|
| Slow LogMeal response | 30 s timeout — `httpx.AsyncClient(timeout=30.0)` |
| LogMeal rate limit | 429 is proxied directly to the mobile client |
| Repeated ingredient fetches | 24-hour Supabase cache for ingredient list |
| LogMeal downtime | 502/504 returned with a user-readable message |

Adding an application-layer cache for segmentation results would save API
credits but would produce stale bounding boxes for different images.
The tradeoff is not worth it for this use case.

---

## What would change if LogMeal were replaced with a local model

Running a local food-recognition model (e.g. YOLOv8 + TorchServe) would
shift the bottleneck from network I/O to GPU inference:

| Factor | LogMeal (external) | Local model (estimated) |
|---|---|---|
| Median latency | ~3 s | ~50–200 ms (GPU) |
| Variance | High (network) | Low (deterministic) |
| API credits | 20/day free tier | Unlimited |
| Infrastructure cost | Zero (free tier) | GPU instance (~$0.50–2/hr) |
| Maintenance | Zero | Model updates, serving infra |

The current proxy architecture already isolates the LogMeal integration
point behind the `/logmeal/*` router — swapping to a local model would
require changes only to `backend/app/routers/logmeal.py`, with zero
changes to the mobile app or any other backend module.
