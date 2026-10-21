/**
 * Pretrain (continued pretraining) editor: one raw-text body. The text is
 * stored as the example's single assistant message, so every edit rewrites
 * `messages` as exactly that one plain message.
 */
import type { Message } from '@/engine/types';
import { pretrainText } from '@/engine/types';
import { Textarea } from '@/components/ui/Input';
import { fmtNum } from '@/lib/utils';

export interface PretrainEditorProps {
  /** The example's messages — a single assistant message holding the text. */
  messages: Message[];
  onChange: (patch: { messages: Message[] }) => void;
}

export function PretrainEditor({ messages, onChange }: PretrainEditorProps) {
  const text = pretrainText({ messages });
  return (
    <section className="flex flex-col">
      <div className="tech-label mb-2">Raw text</div>
      <Textarea
        value={text}
        onChange={(e) => onChange({ messages: [{ role: 'assistant', content: e.target.value }] })}
        placeholder="Document text used for continued pretraining."
        aria-label="Raw text"
        className="min-h-80 font-mono text-[13px] leading-relaxed"
        spellCheck={false}
      />
      <p className="text-ink-dim mt-1.5 font-mono text-xs tabular-nums">
        {fmtNum(text.length)} characters · trained on verbatim, no chat template
      </p>
    </section>
  );
}
