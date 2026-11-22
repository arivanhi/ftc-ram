import { resolveVideoEmbedUrl } from '@/lib/format';

export function VideoEmbed({
  url,
  title,
}: {
  url: string | null | undefined;
  title: string;
}) {
  const embed = resolveVideoEmbedUrl(url);
  if (!embed) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-outline-variant/30">
        <iframe
          src={embed.embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <span className="text-[11px] text-on-surface-variant inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] text-primary">smart_display</span>
        {embed.provider === 'youtube' ? 'Video YouTube (putar langsung)' : 'Video Google Drive (putar langsung)'}
      </span>
    </div>
  );
}
