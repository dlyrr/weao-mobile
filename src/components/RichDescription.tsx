import * as WebBrowser from 'expo-web-browser';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { font } from '../theme/typography';
import { Callout } from './ui';

/**
 * Renders the `slug.fullDescription` mini-markdown WEAO ships with each exploit.
 *
 * The format, observed across every tracked exploit:
 *   "* item"        -> bullet
 *   "! text"        -> warning callout (the site tints these yellow)
 *   "**bold**"      -> bold run
 *   "[label](url)"  -> link
 * Blank lines separate paragraphs.
 */

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'warning'; text: string };

export function parseDescription(source: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('* ')) {
      blocks.push({ kind: 'bullet', text: line.slice(2).trim() });
    } else if (line.startsWith('! ')) {
      blocks.push({ kind: 'warning', text: line.slice(2).trim() });
    } else if (line === '!') {
      // A bare "!" is a spacer between warning lines; drop it.
      continue;
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }

  // Consecutive warning lines read as one block on the site, so merge them.
  const merged: Block[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (block.kind === 'warning' && last?.kind === 'warning') {
      last.text = `${last.text}\n\n${block.text}`;
    } else {
      merged.push({ ...block });
    }
  }

  return merged;
}

type Span = { text: string; bold?: boolean; href?: string };

/** Splits a line into bold / link / plain runs. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  // Alternates on **bold** and [label](url) in one pass.
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      spans.push({ text: text.slice(cursor, match.index) });
    }
    if (match[1] !== undefined) {
      spans.push({ text: match[1], bold: true });
    } else {
      spans.push({ text: match[2], href: match[3] });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) spans.push({ text: text.slice(cursor) });
  return spans;
}

function InlineText({ text, style }: { text: string; style?: object }) {
  const c = useColors();
  const spans = useMemo(() => parseInline(text), [text]);

  return (
    <Text style={[styles.body, { color: c.foregroundAlt }, style]}>
      {spans.map((span, i) => {
        if (span.href) {
          return (
            <Text
              key={i}
              style={{ color: c.interactiveSelectedBorder, fontFamily: font.medium }}
              onPress={() => {
                WebBrowser.openBrowserAsync(span.href!).catch(() => {});
              }}
            >
              {span.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={span.bold ? { fontFamily: font.semibold, color: c.foreground } : undefined}>
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
}

export function RichDescription({ source }: { source: string }) {
  const c = useColors();
  const blocks = useMemo(() => parseDescription(source), [source]);

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        if (block.kind === 'bullet') {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: c.interactiveSelectedBorder }]}>•</Text>
              <InlineText text={block.text} style={styles.bulletText} />
            </View>
          );
        }

        if (block.kind === 'warning') {
          return (
            <Callout key={i} tone="yellow">
              <InlineText text={block.text} />
            </Callout>
          );
        }

        return <InlineText key={i} text={block.text} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  body: {
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  bulletDot: {
    fontFamily: font.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
  },
});
