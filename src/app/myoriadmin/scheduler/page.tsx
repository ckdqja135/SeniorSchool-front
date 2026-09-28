"use client";

/**
 * 시스템 관리 › 스케줄러 실행.
 *
 * - 스케줄러 실행: 카드에서 여러 개를 골라 같은 기간으로 실행 (순서대로 하나씩)
 * - 진행 상황: 실행 현황 바로 위. 대기 중인 항목만 ✕ 로 뺄 수 있다
 * - 스케줄러 실행 현황: 수동·정기 실행 기록이 같이 쌓인다
 *
 * 사이드바·상단 헤더는 관리자 공용 레이아웃(DashboardLayout)이 그린다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { JobGrid } from "@/components/feature/admin/schedulerRun/JobGrid";
import { QueuePanel } from "@/components/feature/admin/schedulerRun/QueuePanel";
import { RunTable } from "@/components/feature/admin/schedulerRun/RunTable";
import {
  apiGet,
  apiSend,
  yesterday,
  type Progress,
  type RunsResponse,
  type SchedulerJob,
} from "@/components/feature/admin/schedulerRun/shared";

export default function SchedulerRunPage() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [periodFrom, setPeriodFrom] = useState(yesterday());
  const [periodTo, setPeriodTo] = useState(yesterday());

  const [progress, setProgress] = useState<Progress | null>(null);
  const [runs, setRuns] = useState<RunsResponse | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);

  const [starting, setStarting] = useState(false);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const r = await apiGet<{ data: SchedulerJob[] }>("/admin/scheduler-run/jobs");
      setJobs(r.data || []);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await apiGet<RunsResponse>("/admin/scheduler-run/runs?limit=100"));
    } catch {
      setRuns(null);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    loadRuns();
  }, [loadJobs, loadRuns]);

  // 큐가 비어 있을 때도 새 실행을 놓치지 않게 계속 폴링한다 (정기 실행도 여기 잡힌다).
  // 방금 전까지 돌고 있었다면 끝난 직후 목록·기록을 한 번 새로 받는다.
  const wasBusy = useRef(false);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await apiGet<Progress>("/admin/scheduler-run/progress");
        if (!alive) return;
        setProgress(p);
        const busy = p.runningCount + p.waitingCount > 0;
        if (wasBusy.current && !busy) {
          loadJobs();
          loadRuns();
        }
        wasBusy.current = busy;
      } catch {
        /* 폴링 실패는 넘긴다 */
      }
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [loadJobs, loadRuns]);

  const start = async () => {
    setStarting(true);
    setNotice(null);
    try {
      const r = await apiSend<{ message: string }>("POST", "/admin/scheduler-run/run", {
        keys: picked,
        periodFrom,
        periodTo,
      });
      setNotice({ ok: true, text: r.message });
      setPicked([]);
      loadRuns();
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message || "실행에 실패했습니다." });
    } finally {
      setStarting(false);
    }
  };

  const cancel = async (id: string) => {
    setCanceling(id);
    try {
      const r = await apiSend<{ message: string }>("DELETE", `/admin/scheduler-run/queue/${id}`);
      setNotice({ ok: true, text: r.message });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message || "취소에 실패했습니다." });
    } finally {
      setCanceling(null);
    }
  };

  return (
    <main className="flex w-full max-w-[1480px] flex-col gap-4 px-7 pb-6 pt-6 text-[#151A26]">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">스케줄러 실행</h1>
        <p className="mt-1 text-[13px] text-[#7A8296]">정기 작업을 지금 실행하고, 실행 기록을 확인합니다.</p>
      </div>

      {notice && (
        <div
          role={notice.ok ? "status" : "alert"}
          className="rounded-[12px] px-3.5 py-2.5 text-[13px]"
          style={{
            color: notice.ok ? "#0E7A43" : "#C23B3B",
            background: notice.ok ? "#E4F6EC" : "#FDECEC",
          }}
        >
          {notice.text}
        </div>
      )}

      <JobGrid
        jobs={jobs}
        loading={jobsLoading}
        picked={picked}
        onPickedChange={setPicked}
        periodFrom={periodFrom}
        periodTo={periodTo}
        onPeriodChange={(f, t) => {
          setPeriodFrom(f);
          setPeriodTo(t);
        }}
        onRun={start}
        running={starting}
      />

      <QueuePanel progress={progress} onCancel={cancel} canceling={canceling} />

      <RunTable data={runs} loading={runsLoading} />
    </main>
  );
}
