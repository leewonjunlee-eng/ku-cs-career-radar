'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type OpportunityTagFilterProps = {
  tags: readonly string[];
  selectedTags: readonly string[];
};

export function OpportunityTagFilter({ tags, selectedTags }: OpportunityTagFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleTag(tag: string) {
    const params = new URLSearchParams(searchParams.toString());
    const currentTags = params.getAll('tag');
    params.delete('tag');

    for (const currentTag of currentTags) {
      if (currentTag !== tag) params.append('tag', currentTag);
    }
    if (!currentTags.includes(tag)) params.append('tag', tag);
    params.delete('page');

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">태그</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selected ? 'border-primary bg-sky-50 font-medium text-primary' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
