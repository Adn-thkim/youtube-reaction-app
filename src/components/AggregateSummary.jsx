export default function AggregateSummary({ aggregateAnalysis, filters, meta }) {
  const classificationCounts = (meta?.classificationCounts || {});
  const publishedRangeLabel = filters.publishedRangeLabel || '전체';

  return (
    <section className="mb-5 rounded-2xl border border-blue-900/70 bg-blue-950/30 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200 mb-2">
        <span className="rounded-full bg-blue-500/10 px-2 py-1 border border-blue-800">
          국가 필터: {filters.countryCode}
        </span>
        <span className="rounded-full bg-blue-500/10 px-2 py-1 border border-blue-800">
          게시 시점: {publishedRangeLabel}
        </span>
        <span className="rounded-full bg-blue-500/10 px-2 py-1 border border-blue-800">
          후보 영상: {meta.candidateCount}개
        </span>
        <span className="rounded-full bg-blue-500/10 px-2 py-1 border border-blue-800">
          유효 영상: {meta.validCount}개
        </span>
        <span className="rounded-full bg-blue-500/10 px-2 py-1 border border-blue-800">
          미채택: {meta.filteredOutCount}개
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-emerald-200">
          review {classificationCounts.review || 0}
        </span>
        <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-1 text-amber-200">
          comparison {classificationCounts.comparison || 0}
        </span>
        <span className="rounded-full border border-fuchsia-800 bg-fuchsia-950/40 px-2 py-1 text-fuchsia-200">
          promotional signal {classificationCounts.promotional || 0}
        </span>
      </div>

      <h2 className="text-yt-text text-lg font-semibold mb-2">9개 영상 반응 종합 요약</h2>
      <p className="text-sm text-yt-text leading-6">
        {aggregateAnalysis?.overallSummary || '종합 요약이 아직 생성되지 않았습니다.'}
      </p>

      <p className="mt-3 text-xs text-yt-subtext">
        국가 필터는 YouTube `regionCode` 기반 검색 지역 필터이며, 영상 자체의 실제 제작 국가를
        완전히 보장하지는 않습니다.
      </p>
      <p className="mt-1 text-xs text-yt-subtext">
        후보군 전체를 조회한 뒤 조건을 통과하고 댓글 표본이 충분한 영상만 최종 결과에 포함합니다.
      </p>
    </section>
  );
}
