import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export default function AnalysisBox({ analysis, collection }) {
  if (!analysis) return null;

  const positive = analysis.sentiment?.positive || 0;
  const negative = analysis.sentiment?.negative || 0;
  const neutral = analysis.sentiment?.neutral || 0;

  return (
    <div className="mt-3 rounded-lg bg-yt-surface border border-yt-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-yt-subtext">
          선별 댓글 {collection?.selectedCommentCount || 0}개
        </div>
        <div className="text-xs text-yt-subtext">
          원본 댓글 {collection?.rawCommentCount || 0}개
        </div>
      </div>

      <div className="rounded-lg bg-yt-card border border-yt-border p-2.5">
        <p className="text-[11px] uppercase tracking-wide text-yt-subtext mb-1">영상 1줄 요약</p>
        <p className="text-sm text-yt-text leading-5">{analysis.videoSummaryOneLine}</p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xs w-8 text-right">{positive}%</span>
          <div className="flex-1 bg-yt-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${positive}%` }}
            />
          </div>
          <span className="text-green-300 text-xs w-10">긍정</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-300 text-xs w-8 text-right">{neutral}%</span>
          <div className="flex-1 bg-yt-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${neutral}%` }}
            />
          </div>
          <span className="text-amber-200 text-xs w-10">중립</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs w-8 text-right">{negative}%</span>
          <div className="flex-1 bg-yt-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-700"
              style={{ width: `${negative}%` }}
            />
          </div>
          <span className="text-red-300 text-xs w-10">부정</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-lg border border-green-900/60 bg-green-950/20 p-2.5">
          <div className="flex items-center gap-1.5 text-green-300 text-xs font-semibold mb-1">
            <TrendingUp size={13} />
            <span>긍정 댓글 요약</span>
          </div>
          <p className="text-sm text-yt-text leading-5">{analysis.positiveCommentSummary}</p>
        </div>

        {neutral > 0 && (
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-2.5">
            <div className="flex items-center gap-1.5 text-amber-200 text-xs font-semibold mb-1">
              <Minus size={13} />
              <span>중립 비중</span>
            </div>
            <p className="text-sm text-yt-text leading-5">
              정보 전달형, 조건부 평가, 긍부정이 분명하지 않은 반응이 {neutral}% 포함되어 있습니다.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-2.5">
          <div className="flex items-center gap-1.5 text-red-300 text-xs font-semibold mb-1">
            <TrendingDown size={13} />
            <span>부정 댓글 요약</span>
          </div>
          <p className="text-sm text-yt-text leading-5">{analysis.negativeCommentSummary}</p>
        </div>
      </div>
    </div>
  );
}
