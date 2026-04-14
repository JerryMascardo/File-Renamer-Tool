import { useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';

const getNameParts = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: filename, ext: '' };
  }

  return {
    base: filename.slice(0, lastDot),
    ext: filename.slice(lastDot)
  };
};

const applyRenameRules = (filename, options, index) => {
  const { base, ext } = getNameParts(filename);
  let nextName = base;

  if (options.findText) {
    nextName = nextName.split(options.findText).join(options.replaceText);
  }

  nextName = `${options.prefix}${nextName}${options.suffix}`;

  if (options.numberingEnabled) {
    const number = options.startNumber + index;
    const formattedNumber = String(number).padStart(options.padding, '0');
    nextName = `${nextName}${formattedNumber}`;
  }

  return `${nextName}${ext}`;
};

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [numberingEnabled, setNumberingEnabled] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(3);

  const renameOptions = useMemo(
    () => ({
      prefix,
      suffix,
      findText,
      replaceText,
      numberingEnabled,
      startNumber: Number(startNumber) || 0,
      padding: Number(padding) || 1
    }),
    [prefix, suffix, findText, replaceText, numberingEnabled, startNumber, padding]
  );

  const previewRows = useMemo(
    () =>
      files.map((entry, index) => ({
        ...entry,
        newName: applyRenameRules(entry.file.name, renameOptions, index)
      })),
    [files, renameOptions]
  );

  const addFiles = (incomingFiles) => {
    const mapped = Array.from(incomingFiles).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file
    }));

    setFiles((prev) => [...prev, ...mapped]);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((entry) => entry.id !== id));
  };

  const clearFiles = () => setFiles([]);

  const downloadZip = async () => {
    if (!previewRows.length) {
      return;
    }

    const zip = new JSZip();

    previewRows.forEach(({ file, newName }) => {
      zip.file(newName, file);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'renamed-files.zip';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">File Renamer Tool</h1>
          <p className="mt-2 text-slate-600">
            Upload files, apply naming rules, and download everything as a ZIP in seconds.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <p className="text-lg font-semibold">Drag & drop files here</p>
              <p className="mt-1 text-sm text-slate-600">or click below to browse</p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
                onClick={() => inputRef.current?.click()}
              >
                Select Files
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Find text</span>
                <input
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                  placeholder="old"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Replace with</span>
                <input
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                  placeholder="new"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Prefix</span>
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                  placeholder="project_"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Suffix</span>
                <input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                  placeholder="_final"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={numberingEnabled}
                  onChange={(e) => setNumberingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Enable auto numbering</span>
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Start number</span>
                  <input
                    type="number"
                    min="0"
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value)}
                    disabled={!numberingEnabled}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring disabled:bg-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Padding</span>
                  <input
                    type="number"
                    min="1"
                    value={padding}
                    onChange={(e) => setPadding(e.target.value)}
                    disabled={!numberingEnabled}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring disabled:bg-slate-100"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadZip}
                disabled={!files.length}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Download ZIP
              </button>
              <button
                type="button"
                onClick={clearFiles}
                disabled={!files.length}
                className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Clear All
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live Preview</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {previewRows.length} file{previewRows.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="max-h-[540px] space-y-3 overflow-auto pr-1">
              {!previewRows.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  Add files to see renamed previews.
                </div>
              ) : (
                previewRows.map(({ id, file, newName }) => (
                  <article
                    key={id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-sm"
                  >
                    <p className="text-sm text-slate-500">Original</p>
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="mt-2 text-sm text-slate-500">New</p>
                    <p className="truncate font-semibold text-indigo-700">{newName}</p>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="mt-3 text-sm font-medium text-rose-600 hover:text-rose-500"
                    >
                      Remove
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
