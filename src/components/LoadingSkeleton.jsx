const SEARCH_STEPS = [
  {
    threshold: 0,
    title: '후보 영상 수집',
    description: 'YouTube 검색 결과와 기본 메타데이터를 불러오고 있습니다.',
  },
  {
    threshold: 4,
    title: '유효 영상 판별',
    description: '국가, 게시 시점, 길이, 댓글 조건을 적용해 분석 대상을 추리고 있습니다.',
  },
  {
    threshold: 10,
    title: '댓글 선별 및 반응 분석',
    description: '영상별 댓글을 선별하고 Claude CLI로 요약을 생성하고 있습니다.',
  },
  {
    threshold: 24,
    title: '종합 요약 생성',
    description: '영상별 결과를 묶어 검색어 기준 종합 요약을 만드는 중입니다.',
  },
];

/**
 * LoadingSkeleton 컴포넌트
 * API 로딩 중 Skeleton UI 표시 (9개 카드)
 */
function SkeletonCard() {
  return (
    <div className="bg-yt-card border border-yt-border rounded-xl overflow-hidden animate-pulse">
      {/* 썸네일 스켈레톤 */}
      <div className="aspect-video bg-yt-surface" />

      {/* 카드 정보 스켈레톤 */}
      <div className="p-3 space-y-2.5">
        {/* 제목 */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-yt-surface rounded-full w-full" />
          <div className="h-3.5 bg-yt-surface rounded-full w-4/5" />
        </div>

        {/* 채널명 & 날짜 */}
        <div className="flex justify-between">
          <div className="h-3 bg-yt-surface rounded-full w-1/3" />
          <div className="h-3 bg-yt-surface rounded-full w-1/5" />
        </div>

        {/* 통계 */}
        <div className="flex gap-3">
          <div className="h-3 bg-yt-surface rounded-full w-16" />
          <div className="h-3 bg-yt-surface rounded-full w-12" />
        </div>

        {/* 분석 박스 스켈레톤 */}
        <div className="mt-3 rounded-lg bg-yt-surface border border-yt-border p-3 space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-yt-border rounded-full w-1/4" />
            <div className="h-3 bg-yt-border rounded-full w-1/3" />
          </div>
          <div className="h-2 bg-yt-border rounded-full w-full" />
          <div className="h-2 bg-yt-border rounded-full w-3/4" />
        </div>
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ query = '', elapsedSeconds = 0 }) {
  const activeStepIndex = SEARCH_STEPS.reduce((currentIndex, step, index) => {
    return elapsedSeconds >= step.threshold ? index : currentIndex;
  }, 0);

  const activeStep = SEARCH_STEPS[activeStepIndex];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-900/70 bg-blue-950/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-blue-200">
              <span className="text-yt-text font-medium">"{query || '검색어'}"</span> 검색을 처리하는
              중입니다
            </p>
            <h2 className="mt-1 text-lg font-semibold text-yt-text">{activeStep.title}</h2>
            <p className="mt-1 text-sm leading-6 text-yt-subtext">{activeStep.description}</p>
          </div>

          <div className="rounded-xl border border-blue-800 bg-blue-950/40 px-3 py-2 text-sm text-blue-200">
            경과 시간 {elapsedSeconds}초
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {SEARCH_STEPS.map((step, index) => {
            const isDone = index < activeStepIndex;
            const isActive = index === activeStepIndex;

            return (
              <div
                key={step.title}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'border-blue-700 bg-blue-900/40 text-blue-100'
                    : isDone
                      ? 'border-emerald-900/70 bg-emerald-950/20 text-emerald-200'
                      : 'border-yt-border bg-yt-card text-yt-subtext'
                }`}
              >
                <div className="font-semibold">{step.title}</div>
                <div className="mt-1 leading-5">{step.description}</div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-yt-subtext">
          캐시가 없는 첫 검색은 보통 20~40초 정도 걸리며, 댓글이 많은 검색어는 더 오래 걸릴 수
          있습니다.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
