import { Pipe, PipeTransform } from '@angular/core';
import { isArray, isEmpty } from 'lodash-es';
import { assertUnreachable } from '../../lang/lang-utils';

@Pipe({ name: 'htHighlight' })
export class HighlightPipe implements PipeTransform {
  private escapeReserveRegExpCharacters(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  public transform(fullText: string, highlightSnippets: TextHighlightConfig | TextHighlightConfig[]): string {
    const snippetsToHighlight: TextHighlightConfig[] = isArray(highlightSnippets)
      ? highlightSnippets
      : [highlightSnippets];

    return snippetsToHighlight.reduce((highlightedText, highlightConfig) => {
      const highlightHtmlTag = getHtmlTagForHighlightType(highlightConfig.highlightType);

      if (highlightConfig.text === undefined || isEmpty(highlightConfig.text)) {
        return highlightedText;
      }

      return highlightedText.replace(
        new RegExp(this.escapeReserveRegExpCharacters(highlightConfig.text), 'ig'),
        `<${highlightHtmlTag}>$&</${highlightHtmlTag}>`
      );
    }, fullText);
  }
}

export type HighlightType = 'mark' | 'bold' | 'italic';

export interface TextHighlightConfig {
  text?: string;
  highlightType: HighlightType;
}

const getHtmlTagForHighlightType = (type: HighlightType): string | undefined => {
  switch (type) {
    case 'bold':
      return 'b';
    case 'mark':
      return 'mark';
    case 'italic':
      return 'i';
    default:
      assertUnreachable(type);
  }
};
