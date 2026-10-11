import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker, OEM } from 'tesseract.js';
import { createRequire } from 'node:module';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { finished } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ara = require('@tesseract.js-data/ara');
const rus = require('@tesseract.js-data/rus');
const MAX_PAGE_COUNT = 332;

function parseOptions(args) {
  const options = { from: 1, to: MAX_PAGE_COUNT, pdf: null, output: null };
  for (const arg of args) {
    const match = /^--(from|to|pdf|output)=(.+)$/.exec(arg);
    if (!match) throw new Error(`Неизвестный параметр: ${arg}`);
    const [, key, value] = match;
    options[key] = key === 'from' || key === 'to' ? Number(value) : value;
  }
  if (!options.pdf || !options.output) {
    throw new Error(
      'Укажите --pdf=ПУТЬ --output=ПУТЬ и, при необходимости, диапазон --from=1 --to=332.',
    );
  }
  if (
    !Number.isInteger(options.from) ||
    !Number.isInteger(options.to) ||
    options.from < 1 ||
    options.to < options.from ||
    options.to > MAX_PAGE_COUNT
  ) {
    throw new RangeError(`Диапазон страниц должен быть от 1 до ${MAX_PAGE_COUNT}.`);
  }
  options.pdf = isAbsolute(options.pdf) ? options.pdf : resolve(options.pdf);
  options.output = isAbsolute(options.output) ? options.output : resolve(options.output);
  return options;
}

function createCanvasFactory() {
  return {
    create(width, height) {
      const canvas = createCanvas(width, height);
      return { canvas, context: canvas.getContext('2d') };
    },
    reset(canvasAndContext, width, height) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    },
    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };
}

async function readCompletedPages(outputPath) {
  if (!existsSync(outputPath)) return new Set();
  const completed = new Set();
  const lines = createInterface({ input: createReadStream(outputPath), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (
        Number.isInteger(record.page) &&
        record.status === 'needs-review' &&
        typeof record.text === 'string' &&
        record.text.trim().length > 0 &&
        !record.error
      ) {
        completed.add(record.page);
      }
    } catch (error) {
      throw new Error(`Повреждён JSONL в файле результатов: ${outputPath}`, { cause: error });
    }
  }
  return completed;
}

const options = parseOptions(process.argv.slice(2));
if (!existsSync(options.pdf)) throw new Error(`PDF не найден: ${options.pdf}`);
mkdirSync(dirname(options.output), { recursive: true });

const completed = await readCompletedPages(options.output);
const output = createWriteStream(options.output, { flags: 'a', encoding: 'utf8' });
const pdfBytes = new Uint8Array(readFileSync(options.pdf));
const loadingTask = getDocument({ data: pdfBytes });
const tessdataPath = await mkdtemp(join(tmpdir(), 'arabic-book-tessdata-'));
let worker;
let processed = 0;
let failed = 0;

try {
  await Promise.all([
    copyFile(join(ara.langPath, 'ara.traineddata.gz'), join(tessdataPath, 'ara.traineddata.gz')),
    copyFile(join(rus.langPath, 'rus.traineddata.gz'), join(tessdataPath, 'rus.traineddata.gz')),
  ]);
  const pdf = await loadingTask.promise;
  if (options.to > pdf.numPages) {
    throw new RangeError(`В этом PDF ${pdf.numPages} страниц, а не ${MAX_PAGE_COUNT}.`);
  }

  worker = await createWorker('ara+rus', OEM.LSTM_ONLY, {
    langPath: tessdataPath,
    gzip: true,
    logger: (event) => {
      if (event.status === 'recognizing text' && event.progress === 1) {
        console.log(`Распознана страница ${event.userJobId ?? ''}`.trim());
      }
    },
  });
  const canvases = createCanvasFactory();
  for (let pageNumber = options.from; pageNumber <= options.to; pageNumber += 1) {
    if (completed.has(pageNumber)) {
      console.log(`Пропуск уже обработанной страницы ${pageNumber}`);
      continue;
    }

    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.4 });
      const { canvas, context } = canvases.create(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      try {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          canvasFactory: canvases,
        }).promise;
        const { data } = await worker.recognize(canvas.toBuffer('image/png'));
        const record = {
          page: pageNumber,
          confidence: Number(data.confidence.toFixed(2)),
          status: 'needs-review',
          ocrEngine: 'tesseract.js/ara+rus',
          recognizedAt: new Date().toISOString(),
          text: data.text.trim(),
        };
        if (!output.write(`${JSON.stringify(record)}\n`)) {
          await new Promise((resolveWrite) => output.once('drain', resolveWrite));
        }
        processed += 1;
        console.log(
          `Страница ${pageNumber}/${pdf.numPages}: confidence=${record.confidence}, символов=${record.text.length}; результат не проверен`,
        );
      } finally {
        canvases.destroy({ canvas, context });
        page.cleanup();
      }
    } catch (error) {
      failed += 1;
      const record = {
        page: pageNumber,
        confidence: 0,
        status: 'needs-review',
        ocrEngine: 'tesseract.js/ara+rus',
        recognizedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        text: '',
      };
      if (!output.write(`${JSON.stringify(record)}\n`)) {
        await new Promise((resolveWrite) => output.once('drain', resolveWrite));
      }
      console.error(`Страница ${pageNumber}: ${record.error}`);
    }
  }
} finally {
  await worker?.terminate();
  await loadingTask.destroy();
  output.end();
  await finished(output);
  await rm(tessdataPath, { recursive: true, force: true });
}

console.log(
  `Готово: обработано ${processed}, ошибок ${failed}. Все строки сохранены со статусом needs-review в ${options.output}.`,
);
