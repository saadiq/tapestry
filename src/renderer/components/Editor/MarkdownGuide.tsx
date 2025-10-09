import { X } from 'lucide-react';

interface MarkdownGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarkdownGuide = ({ isOpen, onClose }: MarkdownGuideProps) => {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Markdown Syntax Guide</h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cheat sheet content - two column layout */}
        <div className="space-y-6">
          {/* Text Formatting */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Text Formatting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">**bold text**</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm"><strong>bold text</strong></p>
              </div>

              <div>
                <code className="text-sm">*italic text*</code>
              </div>
              <div>
                <p className="text-sm"><em>italic text</em></p>
              </div>

              <div>
                <code className="text-sm">***bold and italic***</code>
              </div>
              <div>
                <p className="text-sm"><strong><em>bold and italic</em></strong></p>
              </div>

              <div>
                <code className="text-sm">~~strikethrough~~</code>
              </div>
              <div>
                <p className="text-sm"><s>strikethrough</s></p>
              </div>

              <div>
                <code className="text-sm">`inline code`</code>
              </div>
              <div>
                <p className="text-sm"><code>inline code</code></p>
              </div>
            </div>
          </section>

          {/* Headings */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Headings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm"># Heading 1</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="font-bold text-2xl">Heading 1</p>
              </div>

              <div>
                <code className="text-sm">## Heading 2</code>
              </div>
              <div>
                <p className="font-bold text-xl">Heading 2</p>
              </div>

              <div>
                <code className="text-sm">### Heading 3</code>
              </div>
              <div>
                <p className="font-bold text-lg">Heading 3</p>
              </div>

              <div>
                <code className="text-sm">#### Heading 4</code>
              </div>
              <div>
                <p className="font-bold text-base">Heading 4</p>
              </div>

              <div>
                <code className="text-sm">##### Heading 5</code>
              </div>
              <div>
                <p className="font-bold text-sm">Heading 5</p>
              </div>

              <div>
                <code className="text-sm">###### Heading 6</code>
              </div>
              <div>
                <p className="font-bold text-xs">Heading 6</p>
              </div>
            </div>
          </section>

          {/* Lists */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Lists</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`- Item 1
- Item 2
  - Nested item`}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <ul className="text-sm list-disc list-inside">
                  <li>Item 1</li>
                  <li>Item 2
                    <ul className="list-disc list-inside ml-4">
                      <li>Nested item</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <pre className="text-sm">
{`1. First item
2. Second item
3. Third item`}
                </pre>
              </div>
              <div>
                <ol className="text-sm list-decimal list-inside">
                  <li>First item</li>
                  <li>Second item</li>
                  <li>Third item</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Links & Images */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Links & Images</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm break-all">[Link text](https://example.com)</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm"><a href="#" className="link">Link text</a></p>
              </div>

              <div>
                <code className="text-sm break-all">[Link](https://example.com &quot;Title&quot;)</code>
              </div>
              <div>
                <p className="text-sm"><a href="#" className="link" title="Title">Link with title</a></p>
              </div>

              <div>
                <code className="text-sm break-all">![Alt text](image.png)</code>
              </div>
              <div>
                <p className="text-sm">Image with alt text</p>
              </div>
            </div>
          </section>

          {/* Code */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Code Blocks</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <p className="text-sm">Code block with syntax highlighting</p>
              </div>

              <div>
                <pre className="text-sm">
{`\`\`\`
Plain code block
\`\`\``}
                </pre>
              </div>
              <div>
                <p className="text-sm">Code block without language</p>
              </div>
            </div>
          </section>

          {/* Blockquotes */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Blockquotes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">&gt; Blockquote text</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <blockquote className="text-sm border-l-4 border-base-300 pl-4">
                  Blockquote text
                </blockquote>
              </div>

              <div>
                <pre className="text-sm">
{`> First level
>> Nested quote`}
                </pre>
              </div>
              <div>
                <blockquote className="text-sm border-l-4 border-base-300 pl-4">
                  First level
                  <blockquote className="border-l-4 border-base-300 pl-4 ml-2">
                    Nested quote
                  </blockquote>
                </blockquote>
              </div>
            </div>
          </section>

          {/* Tables */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Tables</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <pre className="text-sm">
{`| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`}
                </pre>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <table className="table table-sm table-zebra">
                  <thead>
                    <tr>
                      <th>Header 1</th>
                      <th>Header 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cell 1</td>
                      <td>Cell 2</td>
                    </tr>
                    <tr>
                      <td>Cell 3</td>
                      <td>Cell 4</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <pre className="text-sm">
{`| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |`}
                </pre>
              </div>
              <div>
                <p className="text-sm">Table with alignment (left, center, right)</p>
              </div>
            </div>
          </section>

          {/* Other */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Other Elements</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-base-content/70 mb-1">Syntax</p>
                <code className="text-sm">---</code>
              </div>
              <div>
                <p className="text-sm text-base-content/70 mb-1">Result</p>
                <hr className="my-2" />
                <p className="text-sm">Horizontal rule</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>

      {/* Backdrop - click to close */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};
