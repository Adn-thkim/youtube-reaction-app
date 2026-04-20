import { fetchVideoComments, searchYoutubeCandidates } from './youtube.js';
import { runClaudeJsonPrompt } from './claudeCli.js';

const COMMENT_CONFIG = {
  maxPages: 5,
  minSelectedComments: 30,
  maxSelectedComments: 180,
  minTextLength: 15,
  minDurationSeconds: 90,
  minCommentCount: 30,
};

const REVIEW_KEYWORDS = [
  '리뷰', '후기', '사용기', '실사용', '써본', '장단점', '경험', '평가', '정리',
  'review', 'hands on', 'hands-on', 'impression',
];

const COMPARISON_KEYWORDS = [
  '비교', 'vs', '대결', '차이', '어떤게', '뭐가 낫', '비교해', 'comparison',
];

const PROMOTIONAL_KEYWORDS = [
  '광고', '협찬', '유료광고', '파트너스', '브랜드 협업', '제공받아', '지원받아',
  'sponsored', 'sponsor', 'promotion', 'promo', 'advertisement', 'ad)',
];

const INFORMATIONAL_KEYWORDS = [
  '설명', '가이드', '정리', '방법', '뉴스', '소개', '해설', '분석',
  'guide', 'explained', 'news', 'overview',
];

function parseDurationToSeconds(isoDuration) {
  const match = isoDuration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeCountryCode(countryCode) {
  if (!countryCode || countryCode === 'GLOBAL') {
    return 'GLOBAL';
  }

  return String(countryCode).trim().toUpperCase();
}

function tokenizeQuery(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function computeRelevanceScore(text, queryTokens) {
  const lowerText = text.toLowerCase();
  return queryTokens.reduce((score, token) => {
    return lowerText.includes(token) ? score + 1 : score;
  }, 0);
}

function countKeywordMatches(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    return lowerText.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function classifyVideoIntent(video) {
  const sourceText = `${video.title} ${video.description}`.toLowerCase();
  const reviewScore = countKeywordMatches(sourceText, REVIEW_KEYWORDS);
  const comparisonScore = countKeywordMatches(sourceText, COMPARISON_KEYWORDS);
  const promotionalScore = countKeywordMatches(sourceText, PROMOTIONAL_KEYWORDS);
  const informationalScore = countKeywordMatches(sourceText, INFORMATIONAL_KEYWORDS);

  let primary = 'general';

  if (comparisonScore > 0) primary = 'comparison';
  else if (reviewScore > 0) primary = 'review';
  else if (informationalScore > 0) primary = 'informational';

  const isPromotionalOnly =
    promotionalScore > 0 && reviewScore === 0 && comparisonScore === 0 && informationalScore === 0;

  return {
    primary,
    reviewScore,
    comparisonScore,
    promotionalScore,
    informationalScore,
    isPromotionalOnly,
  };
}

function evaluateVideoValidity(video, { queryTokens }) {
  const reasons = [];
  const durationSeconds = parseDurationToSeconds(video.duration);
  const titleAndDescription = `${video.title} ${video.description}`;
  const relevanceScore = computeRelevanceScore(titleAndDescription, queryTokens);
  const classification = classifyVideoIntent(video);

  if (video.privacyStatus !== 'public') reasons.push('public_only');
  if (!video.embeddable) reasons.push('not_embeddable');
  if (video.liveBroadcastContent !== 'none') reasons.push('live_or_upcoming');
  if (video.commentCount <= 0) reasons.push('no_comments');
  if (video.commentCount < COMMENT_CONFIG.minCommentCount) reasons.push('too_few_comments');
  if (durationSeconds < COMMENT_CONFIG.minDurationSeconds) reasons.push('too_short');
  if (video.madeForKids) reasons.push('made_for_kids');
  if (relevanceScore === 0) reasons.push('low_query_relevance');
  if (/#shorts/i.test(video.title) || /#shorts/i.test(video.description)) reasons.push('shorts_tagged');
  if (classification.isPromotionalOnly) reasons.push('promotional_only');
  if (
    classification.primary === 'general' &&
    relevanceScore < Math.max(1, Math.ceil(queryTokens.length / 2))
  ) {
    reasons.push('weak_semantic_intent');
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    durationSeconds,
    relevanceScore,
    classification,
  };
}

function scoreComment(comment, queryTokens) {
  const text = comment.text || '';
  const relevanceScore = computeRelevanceScore(text, queryTokens);
  const textLength = text.length;
  const hasSubstance = /[가-힣a-zA-Z0-9]{4,}/.test(text);

  let score = 0;
  if (textLength >= 20 && textLength <= 300) score += 2;
  else if (textLength >= COMMENT_CONFIG.minTextLength) score += 1;

  if (hasSubstance) score += 1;
  if (relevanceScore > 0) score += relevanceScore * 1.5;
  score += Math.min(Math.log10(comment.likeCount + 1), 2.5);

  return score;
}

function selectComments(comments, queryTokens) {
  const scoredComments = comments
    .filter((comment) => (comment.text || '').trim().length >= COMMENT_CONFIG.minTextLength)
    .map((comment) => ({
      ...comment,
      qualityScore: Number(scoreComment(comment, queryTokens).toFixed(2)),
    }))
    .sort((a, b) => b.qualityScore - a.qualityScore);

  return scoredComments.slice(0, COMMENT_CONFIG.maxSelectedComments);
}

function formatCommentPrompt(comments) {
  return comments
    .slice(0, COMMENT_CONFIG.maxSelectedComments)
    .map((comment, index) => {
      return `${index + 1}. [likes=${comment.likeCount}] ${comment.text}`;
    })
    .join('\n');
}

function normalizeSentiment(sentiment = {}) {
  const positive = Math.max(0, Math.min(100, Number(sentiment.positive || 0)));
  const negative = Math.max(0, Math.min(100, Number(sentiment.negative || 0)));
  const neutral = Math.max(0, Math.min(100, Number(sentiment.neutral || 0)));
  const total = positive + negative + neutral;

  if (total === 100) {
    return { positive, negative, neutral };
  }

  if (total === 0) {
    return { positive: 34, negative: 33, neutral: 33 };
  }

  const normalizedPositive = Math.round((positive / total) * 100);
  const normalizedNegative = Math.round((negative / total) * 100);
  return {
    positive: normalizedPositive,
    negative: normalizedNegative,
    neutral: 100 - normalizedPositive - normalizedNegative,
  };
}

function buildClassificationCounts(videos) {
  return videos.reduce(
    (counts, video) => {
      const classification = video.validation?.classification;
      if (!classification) return counts;

      if (classification.primary === 'review') counts.review += 1;
      if (classification.primary === 'comparison') counts.comparison += 1;
      if (classification.promotionalScore > 0) counts.promotional += 1;

      return counts;
    },
    { review: 0, comparison: 0, promotional: 0 }
  );
}

async function analyzeVideo(query, video, selectedComments) {
  const prompt = `
당신은 YouTube 사용자 반응 분석가입니다.

[검색어]
${query}

[영상]
- 제목: ${video.title}
- 채널: ${video.channelTitle}
- 조회수: ${video.viewCount}
- 업로드일: ${video.publishedAt}

[지시사항]
1. 반드시 아래 JSON 객체만 반환하세요.
2. positive, negative, neutral의 합은 정확히 100이어야 합니다.
3. video_summary_one_line은 영상 내용 요약 1문장입니다.
4. positive_comment_summary는 검색어와 관련된 긍정 댓글 반응 1~2문장입니다.
5. negative_comment_summary는 검색어와 관련된 부정 댓글 반응 1~2문장입니다.
6. 정보 전달형, 조건부 평가, 긍부정이 분명하지 않은 반응은 neutral에 반영하세요.
7. 댓글이 검색어와 직접 관계없는 경우는 최대한 제외하고 핵심 반응만 반영하세요.

[응답 스키마]
{
  "sentiment": { "positive": 0, "negative": 0, "neutral": 0 },
  "video_summary_one_line": "",
  "positive_comment_summary": "",
  "negative_comment_summary": ""
}

[선별 댓글]
${formatCommentPrompt(selectedComments)}
  `.trim();

  const result = await runClaudeJsonPrompt(prompt);
  return {
    sentiment: normalizeSentiment(result.sentiment),
    videoSummaryOneLine: result.video_summary_one_line || '',
    positiveCommentSummary: result.positive_comment_summary || '',
    negativeCommentSummary: result.negative_comment_summary || '',
  };
}

async function analyzeAggregate(query, analyzedVideos) {
  const prompt = `
당신은 YouTube 사용자 반응 종합 분석가입니다.

[검색어]
${query}

[영상별 분석 결과]
${analyzedVideos
  .map((video, index) => {
    return `${index + 1}. 제목=${video.title}
- 긍정=${video.analysis.sentiment.positive}, 중립=${video.analysis.sentiment.neutral}, 부정=${video.analysis.sentiment.negative}
- 영상 요약=${video.analysis.videoSummaryOneLine}
- 긍정 반응 요약=${video.analysis.positiveCommentSummary}
- 부정 반응 요약=${video.analysis.negativeCommentSummary}`;
  })
  .join('\n')}

[지시사항]
1. 검색어 기준으로 9개 영상의 사용자 반응을 종합하세요.
2. 2~4문장 분량의 자연스러운 한국어 요약 한 개만 작성하세요.
3. 반드시 아래 JSON 객체만 반환하세요.

{
  "overall_summary": ""
}
  `.trim();

  const result = await runClaudeJsonPrompt(prompt);
  return {
    overallSummary: result.overall_summary || '',
  };
}

export async function runSearchPipeline(input = {}) {
  const query = String(input.query || '').trim();
  const countryCode = normalizeCountryCode(input.countryCode);
  const publishedPreset = String(input.publishedPreset || 'ALL').trim().toUpperCase();
  const publishedAfter = input.publishedAfter ? String(input.publishedAfter).trim() : null;
  const publishedBefore = input.publishedBefore ? String(input.publishedBefore).trim() : null;
  const publishedRangeLabel = input.publishedRangeLabel
    ? String(input.publishedRangeLabel).trim()
    : '전체';

  if (!query) {
    const error = new Error('검색어를 입력해 주세요.');
    error.statusCode = 400;
    error.code = 'EMPTY_QUERY';
    throw error;
  }

  const queryTokens = tokenizeQuery(query);
  const candidates = await searchYoutubeCandidates(query, {
    countryCode,
    publishedAfter,
    publishedBefore,
  });
  const validCandidates = candidates
    .map((video) => {
      const validation = evaluateVideoValidity(video, { queryTokens });
      return {
        ...video,
        validation,
      };
    })
    .filter((video) => video.validation.isValid)
    .sort((a, b) => {
      if (b.validation.relevanceScore !== a.validation.relevanceScore) {
        return b.validation.relevanceScore - a.validation.relevanceScore;
      }
      if (b.validation.classification.comparisonScore !== a.validation.classification.comparisonScore) {
        return b.validation.classification.comparisonScore - a.validation.classification.comparisonScore;
      }
      if (b.validation.classification.reviewScore !== a.validation.classification.reviewScore) {
        return b.validation.classification.reviewScore - a.validation.classification.reviewScore;
      }
      return b.viewCount - a.viewCount;
    });

  if (validCandidates.length === 0) {
    return {
      query,
      filters: {
        countryCode,
        publishedPreset,
        publishedAfter,
        publishedBefore,
        publishedRangeLabel,
        countryFilterMode: countryCode === 'GLOBAL' ? 'none' : 'search_region',
      },
      meta: {
        candidateCount: candidates.length,
        validCount: 0,
        filteredOutCount: candidates.length,
        classificationCounts: {
          review: 0,
          comparison: 0,
          promotional: 0,
        },
        validCriteria: [
          'public video',
          'embeddable',
          'non-live',
          'comments enabled',
          `duration >= ${COMMENT_CONFIG.minDurationSeconds} seconds`,
          'query tokens matched in title or description',
        ],
      },
      videos: [],
      aggregateAnalysis: {
        overallSummary: '조건에 맞는 유효 영상을 찾지 못했습니다.',
      },
    };
  }

  const analyzedVideos = [];

  for (const video of validCandidates) {
    if (analyzedVideos.length >= 9) {
      break;
    }

    const commentResult = await fetchVideoComments(video.videoId, COMMENT_CONFIG.maxPages);
    const selectedComments = selectComments(commentResult.comments, queryTokens);

    if (commentResult.disabled || selectedComments.length < COMMENT_CONFIG.minSelectedComments) {
      continue;
    }

    const analysis = await analyzeVideo(query, video, selectedComments);

    analyzedVideos.push({
      ...video,
      collection: {
        rawCommentCount: commentResult.comments.length,
        selectedCommentCount: selectedComments.length,
        pagesFetched: commentResult.pagesFetched,
      },
      analysis,
    });
  }

  if (analyzedVideos.length === 0) {
    const error = new Error(
      '댓글이 충분한 유효 영상을 확보하지 못했습니다. 검색어를 더 구체화하거나 게시 시점 필터를 완화해 주세요.'
    );
    error.statusCode = 422;
    error.code = 'INSUFFICIENT_VALID_VIDEOS';
    throw error;
  }

  const aggregateAnalysis = await analyzeAggregate(query, analyzedVideos);

  return {
    query,
    filters: {
      countryCode,
      publishedPreset,
      publishedAfter,
      publishedBefore,
      publishedRangeLabel,
      countryFilterMode: countryCode === 'GLOBAL' ? 'none' : 'search_region',
    },
    meta: {
      candidateCount: candidates.length,
      validCount: analyzedVideos.length,
      filteredOutCount: candidates.length - analyzedVideos.length,
      classificationCounts: buildClassificationCounts(analyzedVideos),
      validCriteria: [
        'public video',
        'embeddable',
        'non-live',
        'comments enabled',
        `duration >= ${COMMENT_CONFIG.minDurationSeconds} seconds`,
        `commentCount >= ${COMMENT_CONFIG.minCommentCount}`,
        `selected comments >= ${COMMENT_CONFIG.minSelectedComments}`,
        'query tokens matched in title or description',
        'review/comparison/informational intent preferred',
        'promotional-only videos excluded',
      ],
    },
    videos: analyzedVideos,
    aggregateAnalysis,
  };
}
