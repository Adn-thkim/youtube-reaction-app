import { Clock, Eye, ExternalLink, MessageSquare, ThumbsUp } from 'lucide-react';
import { formatRelativeTime, formatViewCount } from '../api/youtube';
import AnalysisBox from './AnalysisBox';

function getClassificationBadges(classification = {}) {
  const badges = [];

  if (classification.primary === 'review') {
    badges.push({
      key: 'review',
      label: 'review',
      className: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
    });
  }

  if (classification.primary === 'comparison') {
    badges.push({
      key: 'comparison',
      label: 'comparison',
      className: 'border-amber-800 bg-amber-950/40 text-amber-200',
    });
  }

  if (classification.promotionalScore > 0) {
    badges.push({
      key: 'promotional',
      label: 'promotional signal',
      className: 'border-fuchsia-800 bg-fuchsia-950/40 text-fuchsia-200',
    });
  }

  return badges;
}

export default function VideoCard({ video }) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const badges = getClassificationBadges(video.validation?.classification);

  return (
    <article className="bg-yt-card border border-yt-border rounded-xl overflow-hidden hover:border-yt-subtext transition-all duration-200 hover:shadow-lg hover:shadow-black/30 flex flex-col animate-fade-in">
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative group"
        aria-label={`${video.title} 영상 보기`}
      >
        <div className="relative aspect-video bg-yt-surface overflow-hidden">
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          <div className="absolute bottom-2 right-2 bg-black/80 rounded px-1.5 py-0.5 text-white text-xs flex items-center gap-1">
            <Eye size={11} />
            <span>{formatViewCount(video.viewCount)}</span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-yt-red rounded-full p-2.5 shadow-lg">
              <ExternalLink size={18} className="text-white" />
            </div>
          </div>
        </div>
      </a>

      <div className="p-3 flex flex-col flex-1">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yt-text text-sm font-medium line-clamp-2 hover:text-blue-400 transition-colors leading-snug mb-2"
        >
          {video.title}
        </a>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {badges.map((badge) => (
              <span
                key={badge.key}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-yt-subtext text-xs mb-2">
          <span className="truncate max-w-[60%]">{video.channelTitle}</span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock size={11} />
            {formatRelativeTime(video.publishedAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-yt-subtext text-xs mb-1">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatViewCount(video.viewCount)} 조회
          </span>
          {video.likeCount > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsUp size={12} />
              {formatViewCount(video.likeCount)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {formatViewCount(video.commentCount)}
          </span>
        </div>

        <div className="mt-auto">
          <AnalysisBox analysis={video.analysis} collection={video.collection} />
        </div>
      </div>
    </article>
  );
}
